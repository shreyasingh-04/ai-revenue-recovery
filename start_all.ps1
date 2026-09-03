cd backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\activate; uvicorn main:app --reload"

Start-Sleep -Seconds 3
.\venv\Scripts\activate
python simulate_batch.py

cd ..\frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
