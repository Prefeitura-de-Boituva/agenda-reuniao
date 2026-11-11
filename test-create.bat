@echo off
rem Test creation of an agendamento via curl on Windows
rem Adjust URL/port if your dev server runs on a different port
set URL=http://localhost:3000/api/agendamentos

curl -i -X POST %URL% ^
  -H "Content-Type: application/json" ^
  -d "{\"nome\":\"Teste UI\",\"departamento\":\"TI\",\"sala\":\"Sala Azul\",\"data\":\"2026-09-30\",\"horaInicio\":\"10:00\",\"horaFim\":\"11:00\"}"
