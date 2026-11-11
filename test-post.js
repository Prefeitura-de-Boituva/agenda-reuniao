const fetch = require('node-fetch');
(async () => {
  const res = await fetch('http://localhost:3000/api/agendamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Teste2',
      departamento: 'TI',
      sala: 'Sala Azul',
      data: '2026-10-02',
      horaInicio: '10:00',
      horaFim: '11:00'
    })
  });
  console.log('status', res.status);
  console.log('body', await res.text());
})();
