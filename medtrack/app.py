from flask import Flask, render_template, request, redirect, session, jsonify, flash, url_for
import boto3
from botocore.exceptions import ClientError
import uuid
import logging

app = Flask(__name__)
app.secret_key = "medtrack_secret_key"

# ── Logging Setup ─────────────────────────────────────────────────
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ── AWS Configuration ─────────────────────────────────────────────
# boto3 reads credentials from:
#   • Environment vars:  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
#   • ~/.aws/credentials (AWS CLI configured locally)
#   • IAM Role attached to EC2 / Lambda (when deployed on AWS)
REGION      = "ap-south-1"          # ← Change to your region
SNS_TOPIC_ARN = "arn:aws:sns:ap-south-1:339713112656:Medtrack"  # ← Your SNS ARN

dynamodb = boto3.resource('dynamodb', region_name=REGION)
sns      = boto3.client('sns',        region_name=REGION)

users_table        = dynamodb.Table('UsersTable')
appointments_table = dynamodb.Table('AppointmentsTable')

VALID_STATUSES = {'Scheduled', 'Completed', 'Cancelled'}

# ── Helper: short UUID ────────────────────────────────────────────
def short_id(prefix=''):
    return prefix + str(uuid.uuid4())[:8].upper()

# ── Helper: login required ────────────────────────────────────────
def login_required(role=None):
    """Returns redirect if not logged in or wrong role, else None."""
    if 'user' not in session:
        return redirect(url_for('login'))
    if role and session.get('role') != role:
        flash('Access denied. Wrong role.', 'danger')
        return redirect(url_for('home'))
    return None


# ════════════════════════════════════════════════════════════════════
# PUBLIC PAGES
# ════════════════════════════════════════════════════════════════════

@app.route("/")
def home():
    return render_template("index.html")


# ── Register ───────────────────────────────────────────────────────
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name     = request.form.get("name", "").strip()
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        role     = request.form.get("role", "")

        if not all([name, email, password, role]):
            return render_template("register.html", error="All fields are required.")

        try:
            # Check if user already exists
            existing = users_table.get_item(Key={"email": email})
            if "Item" in existing:
                return render_template("register.html", error="An account with this email already exists.")

            users_table.put_item(
                Item={
                    "email":       email,
                    "name":        name,
                    "password":    password,   # ⚠️ Hash passwords in production!
                    "role":        role,
                    "login_count": 0
                }
            )
            logging.info(f"New {role} registered: {email}")
            flash("Account created successfully! Please login.", "success")
            return redirect(url_for("login"))

        except ClientError as e:
            logging.error(f"Register error: {e}")
            return render_template("register.html", error="Server error. Please try again.")

    return render_template("register.html")


# ── Login ──────────────────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        try:
            response = users_table.get_item(Key={"email": email})

            if "Item" in response and response["Item"]["password"] == password:
                user = response["Item"]
                session["user"] = email
                session["role"] = user["role"]
                session["name"] = user.get("name", email)

                # Increment login count
                users_table.update_item(
                    Key={"email": email},
                    UpdateExpression="SET login_count = login_count + :val",
                    ExpressionAttributeValues={":val": 1}
                )

                logging.info(f"Login: {email} ({user['role']})")

                if session["role"] == "doctor":
                    return redirect(url_for("doctor_dashboard"))
                else:
                    return redirect(url_for("patient_dashboard"))

            return render_template("login.html", error="Invalid email or password.")

        except ClientError as e:
            logging.error(f"Login error: {e}")
            return render_template("login.html", error="Server error. Please try again.")

    return render_template("login.html")


# ── Logout ─────────────────────────────────────────────────────────
@app.route("/logout")
def logout():
    user = session.get("user", "unknown")
    session.clear()
    logging.info(f"Logout: {user}")
    flash("You have been logged out.", "info")
    return redirect(url_for("login"))


# ════════════════════════════════════════════════════════════════════
# DASHBOARDS
# ════════════════════════════════════════════════════════════════════

@app.route("/doctor_dashboard")
def doctor_dashboard():
    guard = login_required(role='doctor')
    if guard: return guard
    return render_template("doctor_dashboard.html")


@app.route("/patient_dashboard")
def patient_dashboard():
    guard = login_required(role='patient')
    if guard: return guard
    return render_template("patient_dashboard.html")


# ════════════════════════════════════════════════════════════════════
# APPOINTMENTS
# ════════════════════════════════════════════════════════════════════

# ── Book Appointment ───────────────────────────────────────────────
@app.route("/book_appointment", methods=["GET", "POST"])
def book_appointment():
    guard = login_required()
    if guard: return guard

    if request.method == "POST":
        doctor_email = request.form.get("doctor_email", "").strip().lower()
        date         = request.form.get("date", "").strip()
        time         = request.form.get("time", "").strip()

        if not all([doctor_email, date, time]):
            return render_template("book_appointment.html",
                                   error="All fields are required.")

        appointment_id = str(uuid.uuid4())

        try:
            appointments_table.put_item(
                Item={
                    "appointment_id": appointment_id,
                    "patient_email":  session["user"],
                    "doctor_email":   doctor_email,
                    "date":           date,
                    "time":           time,
                    "status":         "Scheduled"
                }
            )

            # SNS notification
            try:
                sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Message=(
                        f"New appointment booked!\n"
                        f"Patient: {session['user']}\n"
                        f"Doctor:  {doctor_email}\n"
                        f"Date:    {date} at {time}"
                    ),
                    Subject="MedTrack — New Appointment Booked"
                )
            except ClientError as e:
                logging.warning(f"SNS publish failed: {e}")

            logging.info(f"Appointment booked: {appointment_id} by {session['user']}")
            flash(f"Appointment booked successfully! ID: {appointment_id}", "success")
            return redirect(url_for("view_appointment_patient"))

        except ClientError as e:
            logging.error(f"Book appointment error: {e}")
            return render_template("book_appointment.html",
                                   error="Server error. Please try again.")

    return render_template("book_appointment.html")


# ── View Appointments — Doctor ─────────────────────────────────────
@app.route("/view_appointment_doctor")
def view_appointment_doctor():
    guard = login_required(role='doctor')
    if guard: return guard

    try:
        response = appointments_table.scan()
        appointments = [
            item for item in response.get("Items", [])
            if item.get("doctor_email") == session["user"]
        ]
        # Sort by date descending
        appointments.sort(key=lambda x: x.get("date", ""), reverse=True)
    except ClientError as e:
        logging.error(f"View doctor appointments error: {e}")
        appointments = []

    return render_template("view_appointment_doctor.html", appointments=appointments)


# ── View Appointments — Patient ────────────────────────────────────
@app.route("/view_appointment_patient")
def view_appointment_patient():
    guard = login_required(role='patient')
    if guard: return guard

    try:
        response = appointments_table.scan()
        appointments = [
            item for item in response.get("Items", [])
            if item.get("patient_email") == session["user"]
        ]
        appointments.sort(key=lambda x: x.get("date", ""), reverse=True)
    except ClientError as e:
        logging.error(f"View patient appointments error: {e}")
        appointments = []

    return render_template("view_appointment_patient.html", appointments=appointments)


# ── Submit Diagnosis ───────────────────────────────────────────────
@app.route("/submit_diagnosis", methods=["GET", "POST"])
def submit_diagnosis():
    guard = login_required(role='doctor')
    if guard: return guard

    if request.method == "POST":
        appointment_id = request.form.get("appointment_id", "").strip()
        diagnosis      = request.form.get("diagnosis", "").strip()

        if not appointment_id or not diagnosis:
            return render_template("submit_diagnosis.html",
                                   appointment_id=appointment_id,
                                   error="Appointment ID and diagnosis are required.")
        try:
            appointments_table.update_item(
                Key={"appointment_id": appointment_id},
                UpdateExpression="SET diagnosis = :d, #s = :status",
                ExpressionAttributeValues={
                    ":d":      diagnosis,
                    ":status": "Completed"
                },
                ExpressionAttributeNames={"#s": "status"}
            )
            logging.info(f"Diagnosis submitted for {appointment_id} by {session['user']}")
            flash("Diagnosis submitted and appointment marked as Completed.", "success")
            return redirect(url_for("view_appointment_doctor"))

        except ClientError as e:
            logging.error(f"Submit diagnosis error: {e}")
            return render_template("submit_diagnosis.html",
                                   appointment_id=appointment_id,
                                   error="Server error. Please try again.")

    appointment_id = request.args.get("appointment_id", "")
    return render_template("submit_diagnosis.html", appointment_id=appointment_id)


# ── Search Appointments ────────────────────────────────────────────
@app.route("/search", methods=["GET", "POST"])
def search():
    guard = login_required()
    if guard: return guard

    appointments = []
    search_date  = None

    if request.method == "POST":
        search_date = request.form.get("date", "").strip()

        if search_date:
            try:
                response = appointments_table.scan()
                all_appts = response.get("Items", [])

                # Doctors see all; patients see only their own
                if session.get("role") == "doctor":
                    appointments = [
                        a for a in all_appts
                        if a.get("date") == search_date
                        and a.get("doctor_email") == session["user"]
                    ]
                else:
                    appointments = [
                        a for a in all_appts
                        if a.get("date") == search_date
                        and a.get("patient_email") == session["user"]
                    ]
            except ClientError as e:
                logging.error(f"Search error: {e}")

    return render_template("search.html",
                           appointments=appointments,
                           search_date=search_date)


# ════════════════════════════════════════════════════════════════════
# JSON API ENDPOINTS  (used by dashboard stats in script.js)
# ════════════════════════════════════════════════════════════════════

@app.route("/api/appointments")
def api_appointments():
    if "user" not in session:
        return jsonify([])
    try:
        response = appointments_table.scan()
        items    = response.get("Items", [])
        # Each role sees only their own appointments
        if session.get("role") == "doctor":
            items = [a for a in items if a.get("doctor_email") == session["user"]]
        else:
            items = [a for a in items if a.get("patient_email") == session["user"]]
        return jsonify(items)
    except ClientError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/patients")
def api_patients():
    """Returns a count-only response for dashboard stats (patients = users)."""
    if "user" not in session:
        return jsonify([])
    try:
        response = users_table.scan()
        return jsonify(response.get("Items", []))
    except ClientError as e:
        return jsonify({"error": str(e)}), 500


# ── Health Check ───────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "MedTrack running", "region": REGION}), 200


# ── Run ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🏥 MedTrack starting at http://0.0.0.0:5000")
    print(f"📦 AWS Region: {REGION}")
    print("📡 DynamoDB tables: UsersTable, AppointmentsTable")
    app.run(host="0.0.0.0", port=5000, debug=True)
