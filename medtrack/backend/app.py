from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import uuid
from botocore.exceptions import ClientError

# ── App Setup ────────────────────────────────────────────────────
app = Flask(__name__)

# Allow all origins for DELETE and PUT (required for frontend fetch calls)
CORS(app, resources={r"/*": {"origins": "*"}},
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# ── DynamoDB Setup ───────────────────────────────────────────────
# boto3 reads credentials from:
#   - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
#   - ~/.aws/credentials  (if running locally with AWS CLI configured)
#   - IAM role attached to the EC2 / Lambda (if deployed on AWS)
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

patients_table     = dynamodb.Table('Patients')
appointments_table = dynamodb.Table('Appointments')

# Valid appointment status values
VALID_STATUSES = {'BOOKED', 'WAITING', 'ATTENDED'}

# ── Helper ───────────────────────────────────────────────────────
def short_id(prefix=''):
    """Generate a short unique ID like P-3A9F1C2B"""
    return prefix + str(uuid.uuid4())[:8].upper()


# ════════════════════════════════════════════════════════════════
# PATIENT ROUTES
# ════════════════════════════════════════════════════════════════

@app.route('/add_patient', methods=['POST'])
def add_patient():
    """Add a new patient to the Patients DynamoDB table."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body provided'}), 400

    name    = str(data.get('name', '')).strip()
    age     = data.get('age')
    disease = str(data.get('disease', '')).strip()

    if not name or age is None or not disease:
        return jsonify({'error': 'name, age, and disease are required'}), 400

    try:
        age = int(age)
    except (ValueError, TypeError):
        return jsonify({'error': 'age must be a number'}), 400

    patient_id = short_id('P-')

    try:
        patients_table.put_item(
            Item={
                'patient_id': patient_id,
                'name':       name,
                'age':        age,
                'disease':    disease
            }
        )
        return jsonify({
            'message':    'Patient added successfully',
            'patient_id': patient_id
        }), 201

    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


@app.route('/patients', methods=['GET'])
def get_patients():
    """Return all patients from the Patients DynamoDB table."""
    try:
        response = patients_table.scan()
        return jsonify(response.get('Items', [])), 200
    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


@app.route('/delete_patient/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    """Delete a patient from the Patients DynamoDB table by patient_id."""
    try:
        patients_table.delete_item(
            Key={'patient_id': patient_id}
        )
        return jsonify({'message': 'Patient deleted successfully'}), 200
    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


# ════════════════════════════════════════════════════════════════
# APPOINTMENT ROUTES
# ════════════════════════════════════════════════════════════════

@app.route('/book_appointment', methods=['POST'])
def book_appointment():
    """Book a new appointment. Default status is BOOKED."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body provided'}), 400

    patient_id  = str(data.get('patient_id',  '')).strip()
    doctor_name = str(data.get('doctor_name', '')).strip()
    date        = str(data.get('date',        '')).strip()

    if not patient_id or not doctor_name or not date:
        return jsonify({'error': 'patient_id, doctor_name, and date are required'}), 400

    appointment_id = short_id('A-')

    try:
        appointments_table.put_item(
            Item={
                'appointment_id': appointment_id,
                'patient_id':     patient_id,
                'doctor_name':    doctor_name,
                'date':           date,
                'status':         'BOOKED'
            }
        )
        return jsonify({
            'message':        'Appointment booked successfully',
            'appointment_id': appointment_id
        }), 201

    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


@app.route('/appointments', methods=['GET'])
def get_appointments():
    """Return all appointments from the Appointments DynamoDB table."""
    try:
        response = appointments_table.scan()
        return jsonify(response.get('Items', [])), 200
    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


@app.route('/update_status/<appointment_id>', methods=['PUT'])
def update_status(appointment_id):
    """
    Update the status field of an appointment.
    Accepted values: BOOKED | WAITING | ATTENDED
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body provided'}), 400

    status = str(data.get('status', '')).strip().upper()

    if status not in VALID_STATUSES:
        return jsonify({
            'error': f'Invalid status. Allowed values: {", ".join(sorted(VALID_STATUSES))}'
        }), 400

    try:
        appointments_table.update_item(
            Key={'appointment_id': appointment_id},
            UpdateExpression="SET #s = :s",
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':s': status}
        )
        return jsonify({
            'message':        'Status updated',
            'appointment_id': appointment_id,
            'status':         status
        }), 200

    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


@app.route('/delete_appointment/<appointment_id>', methods=['DELETE'])
def delete_appointment(appointment_id):
    """Delete an appointment from the Appointments DynamoDB table by appointment_id."""
    try:
        appointments_table.delete_item(
            Key={'appointment_id': appointment_id}
        )
        return jsonify({'message': 'Appointment deleted successfully'}), 200
    except ClientError as e:
        return jsonify({'error': e.response['Error']['Message']}), 500


# ── Run ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("🏥 MedTrack backend running at http://localhost:5000")
    print("📦 Connected to DynamoDB tables: Patients, Appointments")
    app.run(debug=True, port=5000)
