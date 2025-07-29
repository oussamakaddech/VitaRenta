// frontend/src/components/DemandPrediction.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DemandPrediction = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [forecastData, setForecastData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Tunis');
  const [selectedFuel, setSelectedFuel] = useState('électrique');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locations = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Djerba'];
  const fuelTypes = ['essence', 'diesel', 'électrique', 'hybride'];

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
    }
  }, [token, user, navigate]);

  const handlePredict = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/demand-forecast/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { location: selectedLocation, carburant: selectedFuel, date: selectedDate },
      });
      setForecastData(response.data.forecast);
      setError('');
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          onLogout();
        } else if (err.response.status === 400) {
          setError(err.response.data.error || 'Format de date invalide. Utilisez AAAA-MM-JJ.');
        } else if (err.response.status === 404) {
          setError('Aucune donnée disponible pour cette combinaison.');
        } else {
          setError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setError('Erreur réseau. Veuillez vérifier votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: forecastData.map(item => item.period),
    datasets: [
      {
        label: `Demande prévue (${selectedFuel})`,
        data: forecastData.map(item => item.demand),
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `Prévision de la demande à ${selectedLocation}` },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Nombre de réservations' } },
      x: { title: { display: true, text: 'Date' } },
    },
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Prévision de la demande</h1>
      {user && (user.role === 'admin' || user.role === 'agence') ? (
        <div>
          <form onSubmit={(e) => { e.preventDefault(); handlePredict(); }} aria-labelledby="forecast-form-title">
            <h2 id="forecast-form-title">Paramètres de prévision</h2>
            <div className="mb-3">
              <label htmlFor="location-select" className="form-label">Localisation</label>
              <select
                id="location-select"
                className="form-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                aria-describedby="location-help"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <small id="location-help" className="form-text text-muted">
                Sélectionnez la ville pour la prévision.
              </small>
            </div>
            <div className="mb-3">
              <label htmlFor="fuel-select" className="form-label">Type de carburant</label>
              <select
                id="fuel-select"
                className="form-select"
                value={selectedFuel}
                onChange={(e) => setSelectedFuel(e.target.value)}
                aria-describedby="fuel-help"
              >
                {fuelTypes.map((fuel) => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
              <small id="fuel-help" className="form-text text-muted">
                Sélectionnez le type de carburant.
              </small>
            </div>
            <div className="mb-3">
              <label htmlFor="date-select" className="form-label">Date de début</label>
              <input
                id="date-select"
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-describedby="date-help"
                required
              />
              <small id="date-help" className="form-text text-muted">
                Sélectionnez la date de début pour la prévision (AAAA-MM-JJ).
              </small>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Chargement...' : 'Prédire'}
            </button>
          </form>

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}

          {forecastData.length > 0 && (
            <div className="mt-4">
              <h3>Résultats de la prévision</h3>
              <Line data={chartData} options={chartOptions} />
              <table className="table table-striped mt-3">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Demande prévue</th>
                    <th scope="col">Type de véhicule</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.period}</td>
                      <td>{item.demand.toFixed(2)}</td>
                      <td>{item.vehicle_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="alert alert-warning" role="alert">
          Accès réservé aux administrateurs et agences.
        </div>
      )}
    </div>
  );
};

export default DemandPrediction;