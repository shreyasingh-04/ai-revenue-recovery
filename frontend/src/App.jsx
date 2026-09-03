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
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-amber-600 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 tracking-tight">
              RecoverAI
            </h1>
          </div>
          <nav className="flex space-x-2 p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-white/10 text-amber-300 shadow-sm' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium text-sm">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all duration-300 ${activeTab === 'audit' ? 'bg-white/10 text-amber-300 shadow-sm' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
            >
              <List className="h-4 w-4" />
              <span className="font-medium text-sm">Audit Trail</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {activeTab === 'dashboard' && <Dashboard metrics={metrics} orders={orders} />}
            {activeTab === 'audit' && <AuditTrail orders={orders} apiBase={API_BASE} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
