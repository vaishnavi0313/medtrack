MedTrack – AWS Cloud Healthcare Management System

MedTrack is a cloud-based healthcare management system that simplifies patient and doctor interactions. The application allows patients to book appointments, doctors to submit diagnoses, and users to manage medical history securely.

The project is built using Flask and deployed on AWS EC2 with DynamoDB for database storage and SNS for sending notifications. Nginx and Gunicorn are used for production deployment, and CloudFront is used as a CDN for faster content delivery.

Features

Patient registration and login

Doctor login and dashboard

Appointment booking and scheduling

Diagnosis submission by doctors

Medical history viewing

Email notifications using AWS SNS

Technologies Used

Python

Flask

HTML, CSS, JavaScript

AWS EC2

AWS DynamoDB

AWS SNS

AWS IAM

Nginx

Gunicorn

AWS CloudFront

AWS Architecture

User Browser → CloudFront → Nginx (EC2) → Gunicorn → Flask Application → DynamoDB & SNS

Outcome

This project demonstrates how to build and deploy a secure and scalable healthcare management system using AWS cloud services. It showcases cloud deployment, database integration, notification services, and production server configuration.
