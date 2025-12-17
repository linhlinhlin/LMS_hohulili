const payload = {
    "name": "Test Class Node",
    "courseId": "77b89d53-623a-46fa-8cca-7b2fcd5e4676",
    "maxStudents": 50,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-06-01T00:00:00Z",
    "scheduleType": "SEMESTER",
    "semester": "HK1-2025"
};

fetch('http://localhost:8088/api/v1/classes', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
})
    .then(res => {
        console.log('Status:', res.status);
        return res.text().then(text => console.log('Body:', text));
    })
    .catch(err => console.error('Error:', err));
