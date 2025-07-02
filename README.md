<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VitaraRenta - Project Overview</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
    <div class="container mx-auto p-6 max-w-4xl">
        <!-- Header -->
        <header class="text-center mb-10">
            <h1 class="text-4xl font-bold text-gray-800">VitaraRenta Project</h1>
            <p class="text-lg text-gray-600 mt-2">An innovative AI-powered vehicle rental platform</p>
        </header>

        <!-- Main Content -->
        <main class="bg-white rounded-lg shadow-lg p-8">
            <!-- Overview -->
            <section class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Overview</h2>
                <p class="text-gray-600">VitaraRenta is a cutting-edge vehicle rental platform powered by AI and machine learning. It focuses on delivering personalized vehicle recommendations, promoting eco-responsible choices, and providing a seamless user experience through a modern technical architecture.</p>
            </section>

            <!-- Table of Contents -->
            <section class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Table of Contents</h2>
                <ul class="list-disc list-inside text-gray-600">
                    <li><a href="#functional-requirements" class="text-blue-600 hover:underline">Functional Requirements</a></li>
                    <li><a href="#non-functional-requirements" class="text-blue-600 hover:underline">Non-Functional Requirements</a></li>
                    <li><a href="#innovative-features" class="text-blue-600 hover:underline">Innovative Features</a></li>
                    <li><a href="#technical-architecture" class="text-blue-600 hover:underline">Technical Architecture</a></li>
                    <li><a href="#ai-ml-processing" class="text-blue-600 hover:underline">AI/ML Processing Layer</a></li>
                </ul>
            </section>

            <!-- Functional Requirements -->
            <section id="functional-requirements" class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Functional Requirements</h2>
                <ul class="list-disc list-inside text-gray-600">
                    <li>Personalized vehicle recommendations based on user preferences and context.</li>
                    <li>Real-time customer support through a conversational AI assistant.</li>
                    <li>Eco-friendly driving incentives and optimized route suggestions.</li>
                    <li>Flexible subscription-based vehicle access.</li>
                </ul>
            </section>

            <!-- Non-Functional Requirements -->
            <section id="non-functional-requirements" class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Non-Functional Requirements</h2>
                <ol class="list-decimal list-inside text-gray-600">
                    <li><strong>Performance</strong>: Fast responses for recommendations and predictions.</li>
                    <li><strong>Scalability</strong>: Capable of handling large volumes of data (clients, vehicles, context).</li>
                    <li><strong>Sustainability</strong>: Promotes eco-responsible choices through responsible AI.</li>
                    <li><strong>Security</strong>: Robust protection of customer data.</li>
                    <li><strong>Maintenance</strong>: Continuous improvement of ML models via a feedback system.</li>
                </ol>
            </section>

            <!-- Innovative Features -->
            <section id="innovative-features" class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Innovative Features</h2>
                <ol class="list-decimal list-inside text-gray-600">
                    <li><strong>Hybrid Recommendation Engine</strong>: Combines collaborative filtering, content-based, and contextual analysis to suggest vehicles tailored to each customer.</li>
                    <li><strong>Advanced Gamification</strong>: Introduces "eco-responsible challenges" (e.g., "Drive 100 km in eco mode to unlock a badge") with tangible rewards.</li>
                    <li><strong>Conversational AI Assistant</strong>: Integrates a chatbot (e.g., based on LLaMA or Grok) for real-time customer interaction.</li>
                    <li><strong>Dynamic Route Optimization</strong>: Recommends energy-efficient routes to reduce consumption.</li>
                    <li><strong>Predictive Maintenance</strong>: Uses telematics data (tire pressure, fuel consumption, etc.) to anticipate vehicle maintenance needs and reduce costs.</li>
                    <li><strong>Subscription Offers</strong>: Flexible access to various vehicles on a monthly or yearly basis, catering to urban users' needs.</li>
                </ol>
            </section>

            <!-- Technical Architecture -->
            <section id="technical-architecture" class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Technical Architecture</h2>
                <ul class="list-disc list-inside text-gray-600">
                    <li><strong>Web Interface</strong>: Built with <strong>React</strong> for a dynamic and responsive user experience.</li>
                    <li><strong>Mobile Application</strong>: Developed using <strong>Flutter</strong> for cross-platform compatibility (iOS and Android).</li>
                    <li><strong>Backend Framework</strong>: Utilizes <strong>Django</strong> for a RESTful API.</li>
                    <li><strong>Microservices</strong>: Separates functionalities to enhance scalability.</li>
                    <li><strong>Database</strong>:
                        <ul class="list-circle list-inside ml-6">
                            <li><strong>PostgreSQL</strong> for structured data.</li>
                            <li>Support for unstructured data (details to be specified).</li>
                        </ul>
                    </li>
                </ul>
            </section>

            <!-- AI/ML Processing Layer -->
            <section id="ai-ml-processing" class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">AI/ML Processing Layer</h2>
                <ul class="list-disc list-inside text-gray-600">
                    <li><strong>Recommendation Engine</strong>: Uses <stong>LightFM</stong> for hybrid recommendations and <strong>BERT-based Transformers</strong> for analyzing textual preferences.</li>
                    <li><strong>Demand Prediction</strong>: Combines <strong>ARIMA</strong> for seasonal demand forecasting and <strong>XGBoost</strong> for contextual predictions (e.g., weather, events).</li>
                    <li><strong>Predictive Maintenance</strong>: Employs <strong>LSTM models</strong> to analyze time-series IoT data for vehicle health monitoring.</li>
                    <li><strong>Eco-Scoring</strong>: Custom algorithm to evaluate vehicles based on CO2 emissions and energy consumption.</li>
                </ul>
            </section>
        </main>

        <!-- Footer -->
        <footer class="text-center mt-10 text-gray-600">
            <p>Thank you for your interest in VitaraRenta!</p>
        </footer>
    </div>
</body>
</html>
