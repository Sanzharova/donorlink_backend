# DonorLink Backend

DonorLink Backend is the server-side application for the DonorLink blood donation management system. The system helps connect blood donors, hospitals, and blood banks through a centralized platform.

## Features

- User authentication and authorization
- Donor registration and profile management
- Blood request management
- Blood donation tracking
- REST API support
- Database integration
- Secure backend architecture

## Technologies Used

- Python
- Django
- Django REST Framework
- PostgreSQL
- JWT Authentication

## Project Structure

donorlink_backend/

├── api/                 # API endpoints  
├── users/               # User management  
├── donations/           # Donation logic  
├── requests/            # Blood request management  
├── config/              # Project configuration  
├── manage.py  
└── requirements.txt  

## Installation

### Clone Repository

```bash
git clone https://github.com/Andr-23/donorlink_backend.git
cd donorlink_backend Create Virtual Environment
python -m venv venv
Activate Virtual Environment
Windows
venv\Scripts\activate
Linux / MacOS
source venv/bin/activate
Install Dependencies
pip install -r requirements.txt
Database Migration
python manage.py makemigrations
python manage.py migrate
Run Server
python manage.py runserver

Server will start at:

http://127.0.0.1:8000/
API Endpoints
Method	Endpoint	Description
POST	/api/register/	User registration
POST	/api/login/	User login
GET	/api/donors/	Get donor list
POST	/api/request/	Create blood request
GET	/api/donations/	Donation history
Authentication

The project uses JWT authentication.

After login, users receive access and refresh tokens for authorized requests.

Future Improvements
Real-time notifications
Hospital dashboard
Blood inventory tracking
Mobile application integration
Geo-location donor search
Author

Developed for academic and healthcare management purposes.

License

This project is intended for educational purposes.
