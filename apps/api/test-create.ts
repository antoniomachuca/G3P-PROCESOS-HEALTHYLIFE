import http from 'node:http';

const req = http.request('http://localhost:3001/api/v1/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log(res.statusCode);
  res.on('data', d => process.stdout.write(d));
});

req.write(JSON.stringify({
  titulo: 'Partido de Futbol',
  deporte: 'futbol',
  nivel: 'intermedio',
  descripcion: 'Partidillo de tarde',
  inicio: new Date(Date.now() + 86400000).toISOString(),
  fin: new Date(Date.now() + 90000000).toISOString(),
  lugar: {
    nombre: 'Campo 1', puntoEncuentro: 'Puerta', municipio: 'Madrid', direccion: 'Calle Falsa', lat: 0, lng: 0
  },
  aforoMaximo: 10,
  material: ['botas'],
  organizadorId: 'usr_mock_010',
  communityGroupId: null,
  routineId: null
}));
req.end();
