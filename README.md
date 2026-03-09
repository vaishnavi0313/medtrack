🏥 MedTrack – AWS Cloud Healthcare Management System

MedTrack is a cloud-based healthcare management system designed to simplify interactions between patients and doctors. The platform allows patients to book appointments, doctors to submit diagnoses, and users to securely access their medical history.

🌐 Live Application:
👉 https://d9qfxfxqu564w.cloudfront.net/

The system is built using Flask and deployed on AWS EC2, with DynamoDB used for database storage and AWS SNS for sending notifications. For production deployment, Nginx and Gunicorn are used to run the application efficiently, while AWS CloudFront acts as a CDN to improve performance and content delivery speed.

🚀 Features

Patient registration and secure login

Doctor login with a dedicated dashboard

Appointment booking and scheduling

Diagnosis submission by doctors

Viewing patient medical history

Email notifications using AWS SNS

Cloud-based deployment using AWS services

🛠 Technologies Used
Backend

Python

Flask

Frontend

HTML

CSS

JavaScript

Cloud Services

AWS EC2 – Hosting the application

AWS DynamoDB – NoSQL database for storing medical data

AWS SNS – Notification service for alerts and updates

AWS IAM – Secure access management

Deployment Tools

Nginx – Reverse proxy server

Gunicorn – WSGI HTTP server for Flask

AWS CloudFront – CDN for faster content delivery

☁️ AWS Architecture
User Browser
     │
     ▼
CloudFront (CDN)
     │
     ▼
Nginx Server (EC2)
     │
     ▼
Gunicorn
     │
     ▼
Flask Application
     │
     ├── DynamoDB (Database)
     └── SNS (Notifications)
🎯 Project Outcome

MedTrack demonstrates how AWS cloud services can be used to build a scalable healthcare management system. The project integrates multiple AWS services to provide secure data handling, reliable infrastructure, and efficient communication between patients and doctors.
