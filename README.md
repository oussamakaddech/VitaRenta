VitaRenta 🚗
A Smart and Sustainable Car Rental Recommendation and Optimization System

Empowering car rental agencies with AI-driven personalization, fleet optimization, and eco-friendly solutions.

📋 Project Overview
VitaRenta is an innovative web and mobile application designed to transform the car rental industry by combining hyper-personalized recommendations, fleet optimization, and sustainable practices.  this project leverages responsible AI to enhance customer experience and operational efficiency while promoting eco-friendly mobility.
Key Features

Personalized Recommendations: Tailored vehicle suggestions based on user profiles, context (e.g., weather, events), and historical data.
Fleet Optimization: Intelligent management of vehicle availability, maintenance, and energy consumption.
Demand Prediction: Anticipate rental demand using temporal models (Prophet, ARIMA) and contextual data.
Eco-Scoring & Gamification: Promote sustainable driving with CO₂ visualizations and rewards (badges, discounts).
Intuitive UX: Seamless booking process with a user-friendly web/mobile interface.
Analytics Dashboard: Provide managers with insights on fleet performance, costs, and customer satisfaction.


📂 Repository Structure
VitaRenta/
├── /backend              # Backend code (APIs, ML models)
│   ├── /api             # REST API (Flask/Django)
│   ├── /models          # ML models (recommendation, prediction)
│   ├── /data            # ETL scripts for data processing
│   ├── /tests           # Backend unit tests
│   └── readme.txt       # Temporary placeholder
├── /frontend            # Frontend code (web and mobile)
│   ├── /web            # Web interface (React.js/Vue.js)
│   │   └── readme.txt  # Temporary placeholder
│   ├── /mobile         # Mobile app (Flutter)
│   │   └── readme.txt  # Temporary placeholder
│   └── /tests          # Frontend unit tests
├── /docs               # Documentation
│   ├── /technical      # Technical architecture and ML models
│   ├── /user           # User guide and deployment manual
│   ├── /ethical        # Ethical and sustainability report
│   └── readme.txt      # Temporary placeholder
├── /assets             # Images and static files
│   └── car-rental.jpg  # Car rental image for README
├── /scripts            # CI/CD and deployment scripts
├── /data               # Datasets (access-controlled)
├── README.md           # This file
├── requirements.txt    # Python dependencies
└── .github/workflows   # GitHub Actions for CI/CD


🛠️ Technologies

Data Science & ML: Python, scikit-learn, TensorFlow/PyTorch, LightFM, Prophet, ARIMA
Backend: Flask/Django (REST API)
Frontend: React.js/Vue.js (web), Flutter (mobile)
Database: PostgreSQL (structured data), MongoDB (unstructured data)
External APIs: OpenWeather (weather), Eventbrite (events)
CI/CD: GitHub Actions, Docker


🚀 Getting Started
Prerequisites

System: Linux, macOS, or Windows (with WSL)
Tools:
Git (download)
Python 3.10+ (download)
Node.js (download) for web frontend
Flutter (download) for mobile app


Accounts: GitHub, API keys for OpenWeather and Eventbrite

Installation

Clone the Repository:
git clone https://github.com/oussamakaddech/VitaRenta.git
cd VitaRenta


Set Up Backend:
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt


Set Up Frontend (Web):
cd frontend/web
npm install
npm start


Set Up Frontend (Mobile):
cd frontend/mobile
flutter pub get
flutter run


Configure Environment Variables:Create a .env file in /backend:
OPENWEATHER_API_KEY=your_key
EVENTBRITE_API_KEY=your_key
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password


Run Tests:
pytest backend/tests



Usage

Backend: Start the API server:cd backend
python api/app.py


Frontend (Web): Access at http://localhost:3000.
Frontend (Mobile): Run on an emulator or device with flutter run.
API: Available at http://localhost:5000 (default).


🤝 Contributing
We welcome contributions to make VitaRenta even better! Follow these steps:

Create a Feature Branch:
git checkout -b feature/your-feature-name


Make Changes:

Add code to the appropriate folder (backend, frontend, etc.).
Follow naming conventions: snake_case for Python, camelCase for JavaScript.
Write unit tests in /tests.


Commit and Push:
git add .
git commit -m "Descriptive commit message"
git push origin feature/your-feature-name


Create a Pull Request:

Open a PR on GitHub targeting the dev branch.
Include a clear description and assign reviewers.
Use labels (e.g., feature, bug, urgent) for clarity.


Code Review:

Ensure tests pass via GitHub Actions.
Address feedback from reviewers.




📅 Roadmap

 Implement hybrid recommendation engine (LightFM + Transformers)
 Develop intuitive booking interface (React.js/Flutter)
 Integrate external APIs (OpenWeather, Eventbrite)
 Build predictive models for demand and maintenance (Prophet, LSTM)
 Add gamification features (eco-rewards, badges)
 Deploy application with Docker and CI/CD

Repository: github.com/oussamakaddech/VitaRenta


VitaRenta: Driving the future of sustainable mobility.
