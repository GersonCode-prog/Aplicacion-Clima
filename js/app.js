document.addEventListener('DOMContentLoaded', () => {
    const apiKey = '83fae74e55f8457ca2b181358242105';
    const weatherApp = document.querySelector('.weather-app');
    const locationInput = document.querySelector('.location-input');
    const searchButton = document.querySelector('.search-button');
    const locationElement = document.querySelector('.location');
    const temperatureElement = document.querySelector('.temperature');
    const descriptionElement = document.querySelector('.description');
    const iconElement = document.querySelector('.icon');
    const forecastElement = document.querySelector('.forecast');

    searchButton.addEventListener('click', () => {
        const city = locationInput.value;
        if (city.trim() !== '') {
            fetchWeatherData(city);
        } else {
            alert('Por favor ingresa el nombre de una ciudad.');
        }
    });

    function fetchWeatherData(city) {
        fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=7&lang=es`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del clima actual');
                }
                return response.json();
            })
            .then(data => {
                const { location, current, forecast } = data;
                locationElement.textContent = `Ubicación: ${location.name}, ${location.region}, ${location.country}`;
                temperatureElement.textContent = `Temperatura: ${current.temp_c}°C`;
                descriptionElement.textContent = `Descripción: ${current.condition.text}`;
                iconElement.innerHTML = `<img src="${current.condition.icon}" alt="${current.condition.text}">`;

                // Determinamos si es de día o de noche
                const isDay = current.is_day === 1;

                // Cambiar el fondo según el estado del clima y la hora del día
                changeBackground(current.condition.code, isDay);

                // Mostrar pronóstico de varios días
                displayForecast(forecast.forecastday);
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                weatherApp.innerHTML = '<p>No se pudo obtener la información del clima.</p>';
            });
    }

    function displayForecast(forecastData) {
        forecastElement.innerHTML = '';
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        forecastData.forEach(day => {
            const forecastItem = document.createElement('div');
            forecastItem.classList.add('forecast-item');
            const date = new Date(day.date);
            const dayOfWeek = daysOfWeek[date.getDay()];
            forecastItem.innerHTML = `
                <p>${dayOfWeek}</p>
                <p>Temperatura: ${day.day.avgtemp_c}°C</p>
                <p>Descripción: ${day.day.condition.text}</p>
                <img src="${day.day.condition.icon}" alt="${day.day.condition.text}">
            `;
            forecastElement.appendChild(forecastItem);
        });
    }
    function changeBackground(weatherCode, isDay) {
        const body = document.querySelector('body');
        const currentTime = new Date().getHours();
    
        // Comprobamos si es de noche
        const isNight = !isDay;
    
        // Lógica para determinar el fondo según el clima y la hora del día
        if (weatherCode >= 1003 && weatherCode <= 1009) {
            // Lluvioso
            if (isNight) {
                body.style.backgroundImage = "url('img/lluvia.jpg')";
            } else {
                body.style.backgroundImage = "url('img/lluvia.jpg')";
            }
        } else if (weatherCode === 1000) {
            // Soleado
            if (isNight) {
                body.style.backgroundImage = "url('img/soleado.jpg')";
            } else {
                body.style.backgroundImage = "url('img/soleado.jpg')";
            }
        } else {
            // Otros casos, como nublado, nieve, etc.
            if (isNight) {
                body.style.backgroundImage = "url('img/noche.jpg')";
            } else {
                body.style.backgroundImage = "url('img/dia.jpg')";
            }
        }
    }
});
