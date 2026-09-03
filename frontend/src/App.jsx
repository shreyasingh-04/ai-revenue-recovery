import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldAlert, BarChart3, List } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AuditTrail from './components/AuditTrail';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [metricsRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/metrics`),
        axios.get(`${API_BASE}/orders`)
      ]);
      setMetrics(metricsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              RecoverAI
            </h1>
          </div>
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Metrics</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${activeTab === 'audit' ? 'bg-slate-800 text-indigo-400' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <List className="h-4 w-4" />
              <span>Audit Logs</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard metrics={metrics} orders={orders} />}
            {activeTab === 'audit' && <AuditTrail orders={orders} apiBase={API_BASE} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
