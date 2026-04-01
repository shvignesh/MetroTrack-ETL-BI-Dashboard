import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  LayoutDashboard, 
  Database, 
  BarChart3, 
  Users, 
  MapPin, 
  Clock, 
  TrendingUp, 
  ArrowRightLeft,
  QrCode,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrainFront,
  Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

// Types
interface StatsSummary {
  totalTrips: number;
  totalRevenue: number;
  avgDistance: number;
  avgFare: number;
  totalPassengers: number;
  uniqueRiders: number;
}

interface DailyStats {
  label: string;
  count: number;
  revenue: number;
}

interface StationStats {
  name: string;
  count: number;
}

interface Trip {
  id: number;
  passenger_id: string;
  passenger_name: string;
  start_station: string;
  end_station: string;
  distance: number;
  fare: number;
  travel_time_minutes: number;
  timestamp: string;
  status: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'transactions' | 'etl'>('dashboard');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [volYear, setVolYear] = useState<number | string>('');
  const [volMonth, setVolMonth] = useState<number | string>('');
  const [volDay, setVolDay] = useState<number | string>('');
  const [stationFlow, setStationFlow] = useState<any[]>([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [etlStatus, setEtlStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [etlProgress, setEtlProgress] = useState(0);
  const [etlYear, setEtlYear] = useState(new Date().getFullYear());
  const [etlMonth, setEtlMonth] = useState(new Date().getMonth());
  const [etlDay, setEtlDay] = useState(new Date().getDate());

  // Search and Detail States
  const [tripSearch, setTripSearch] = useState('');
  const [transSearch, setTransSearch] = useState('');
  const [selectedPassengerId, setSelectedPassengerId] = useState<string | null>(null);
  const [passengerDetails, setPassengerDetails] = useState<any | null>(null);
  const [passengerTransactions, setPassengerTransactions] = useState<any[]>([]);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<1 | 2>(1);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [showRechargeSuccess, setShowRechargeSuccess] = useState<{id: string, name: string} | null>(null);

  const handlePrint = async (passengerId: string, type: 'trips' | 'transactions') => {
    try {
      const res = await fetch(`/api/passengers/${passengerId}/${type}`);
      const data = await res.json();
      const pRes = await fetch(`/api/passengers/${passengerId}`);
      const passenger = await pRes.json();

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const title = type === 'trips' ? 'Journey History' : 'Wallet Transactions';
      
      let tableHtml = '';
      if (type === 'trips') {
        tableHtml = `
          <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left;">
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Date</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Route</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Distance</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Fare</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((t: any) => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${format(new Date(t.timestamp), 'MMM dd, yyyy HH:mm')}</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${t.start_station} → ${t.end_station}</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${(t.distance ?? 0).toFixed(1)} km</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">₹${(t.fare ?? 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        tableHtml = `
          <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left;">
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Date</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Type</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Amount</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((tx: any) => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${format(new Date(tx.timestamp), 'MMM dd, yyyy HH:mm')}</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${tx.type}</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">₹${(tx.amount ?? 0).toFixed(2)}</td>
                  <td style="padding: 12px; border: 1px solid #e2e8f0;">${tx.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>CMRL - ${title}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1e293b; }
              .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              .passenger-info { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .label { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold; }
              .value { font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; color: #2563eb;">Chennai Metro Rail Limited</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.6;">${title} Statement</p>
            </div>
            <div class="passenger-info">
              <div>
                <div class="label">Passenger Name</div>
                <div class="value">${passenger.name}</div>
              </div>
              <div>
                <div class="label">Passenger ID</div>
                <div class="value">${passenger.id}</div>
              </div>
              <div>
                <div class="label">Mobile Number</div>
                <div class="value">${passenger.mobile}</div>
              </div>
              <div>
                <div class="label">Wallet Balance</div>
                <div class="value">₹${(passenger.wallet_balance ?? 0).toFixed(2)}</div>
              </div>
            </div>
            ${tableHtml}
            <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8;">
              This is a computer generated document. CMRL Verified.
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error(e);
      alert('Error generating print view');
    }
  };

  useEffect(() => {
    fetchData();
  }, [volYear, volMonth, volDay]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrips();
    }, 300);
    return () => clearTimeout(timer);
  }, [tripSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [transSearch]);

  useEffect(() => {
    if (selectedPassengerId) {
      fetchPassengerDetails(selectedPassengerId);
    }
  }, [selectedPassengerId]);

  const fetchTrips = async () => {
    try {
      const res = await fetch(`/api/trips?limit=50&search=${encodeURIComponent(tripSearch)}`);
      if (res.ok) setTrips(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`/api/transactions?limit=50&search=${encodeURIComponent(transSearch)}`);
      if (res.ok) setTransactions(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchPassengerDetails = async (id: string) => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`/api/passengers/${id}`),
        fetch(`/api/passengers/${id}/transactions`)
      ]);
      if (pRes.ok) setPassengerDetails(await pRes.json());
      if (tRes.ok) setPassengerTransactions(await tRes.json());
    } catch (e) { console.error(e); }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPassengerId || !rechargeAmount) return;
    setRechargeStep(2);
  };

  const confirmPayment = async () => {
    if (!selectedPassengerId || !rechargeAmount) return;
    
    setRechargeLoading(true);
    try {
      const res = await fetch('/api/passengers/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId: selectedPassengerId, amount: parseFloat(rechargeAmount) })
      });
      
      if (res.ok) {
        setRechargeAmount('');
        setRechargeStep(1);
        setIsRechargeModalOpen(false);
        fetchPassengerDetails(selectedPassengerId);
        fetchData(); // Refresh dashboard stats
      } else {
        const err = await res.json();
        alert(err.error || 'Recharge failed');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during recharge');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleQuickQRRecharge = async (passengerId: string) => {
    try {
      const res = await fetch('/api/passengers/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId, amount: 100 })
      });
      
      if (res.ok) {
        const passenger = await (await fetch(`/api/passengers/${passengerId}`)).json();
        setShowRechargeSuccess({ id: passengerId, name: passenger.name });
        fetchData();
        if (selectedPassengerId === passengerId) {
          fetchPassengerDetails(passengerId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const volumeParams = new URLSearchParams();
      if (volYear) volumeParams.append('year', volYear.toString());
      if (volMonth) volumeParams.append('month', volMonth.toString());
      if (volDay) volumeParams.append('day', volDay.toString());

      const endpoints = [
        '/api/stats/summary',
        `/api/stats/volume?${volumeParams.toString()}`,
        '/api/stats/station-flow',
        '/api/stats/weekly-patterns',
        '/api/stats/peak-hours',
        '/api/trips?limit=20',
        '/api/transactions?limit=20'
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(url)));
      
      for (const res of responses) {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API Error (${res.status}): ${text.substring(0, 100)}`);
        }
      }

      const [summaryData, dailyData, flowData, weeklyData, peakData, tripsData, transData] = await Promise.all(
        responses.map(res => res.json())
      );

      setSummary(summaryData);
      setDailyStats(dailyData);
      setStationFlow(flowData);
      setWeeklyPatterns(weeklyData);
      setPeakHours(peakData);
      setTrips(tripsData);
      setTransactions(transData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runETL = async () => {
    console.log('Starting ETL Pipeline...');
    setEtlStatus('running');
    setEtlProgress(0);
    
    // Start progress simulation immediately for better UX
    const interval = setInterval(() => {
      setEtlProgress(prev => {
        if (prev >= 90) { // Stay at 90% until the request finishes
          return 90;
        }
        const next = prev + 10;
        console.log(`ETL Progress: ${next}%`);
        return next;
      });
    }, 150);

    try {
      // Small artificial delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 500));

      const res = await fetch('/api/etl/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: etlYear, month: etlMonth, day: etlDay })
      });
      
      if (res.ok) {
        console.log('ETL Pipeline request successful');
        // Finish the progress bar
        setEtlProgress(100);
        setTimeout(() => {
          clearInterval(interval);
          setEtlStatus('completed');
          fetchData();
          console.log('ETL Pipeline completed');
        }, 500);
      } else {
        console.error('ETL Pipeline request failed');
        clearInterval(interval);
        setEtlStatus('idle');
        setEtlProgress(0);
        alert('ETL Pipeline failed to start');
      }
    } catch (e) {
      console.error('ETL Pipeline error:', e);
      clearInterval(interval);
      setEtlStatus('idle');
      setEtlProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50">
        <div className="p-6 flex items-center gap-3 border-bottom border-slate-100">
          <div className="bg-blue-700 p-2 rounded-xl">
            <TrainFront className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">Chennai Metro</h1>
        </div>
        
        <nav className="mt-6 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('trips')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'trips' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ArrowRightLeft size={20} />
            Trip Records
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <TrendingUp size={20} />
            Wallet History
          </button>
          <button 
            onClick={() => setActiveTab('etl')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'etl' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database size={20} />
            ETL Pipeline
          </button>
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-6">
          <div className="bg-blue-900 rounded-2xl p-4 text-white">
            <p className="text-xs text-blue-300 uppercase font-bold tracking-widest mb-2">System Status</p>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              CMRL Live Pipeline
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Passenger Analytics'}
              {activeTab === 'trips' && 'Journey History'}
              {activeTab === 'transactions' && 'Wallet Transactions'}
              {activeTab === 'etl' && 'Data Migration Pipeline'}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' && 'Real-time monitoring of Chennai Metro passenger flow.'}
              {activeTab === 'trips' && 'Detailed log of all passenger transactions and movements.'}
              {activeTab === 'transactions' && 'Credit and Debit history for passenger wallets.'}
              {activeTab === 'etl' && 'Manage extraction, transformation, and loading of metro data.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                CM
              </div>
              <span className="font-medium text-slate-700">CMRL Admin</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Active Riders" 
                value={summary?.uniqueRiders.toLocaleString() || '0'} 
                icon={<Users className="text-blue-700" />} 
                trend={`${summary?.totalPassengers.toLocaleString() || '0'} Total Registered`}
              />
              <StatCard 
                title="Total Trips" 
                value={summary?.totalTrips.toLocaleString() || '0'} 
                icon={<ArrowRightLeft className="text-emerald-600" />} 
                trend="+5.4% today"
              />
              <StatCard 
                title="Total Revenue" 
                value={`₹${(summary?.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
                icon={<TrendingUp className="text-amber-600" />} 
                trend={`Avg. Fare: ₹${(summary?.avgFare ?? 0).toFixed(1)}`}
              />
              <StatCard 
                title="Avg. Distance" 
                value={`${(summary?.avgDistance ?? 0).toFixed(1)} km`} 
                icon={<MapPin className="text-purple-600" />} 
                trend="Stable usage"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Passenger Volume */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="font-bold text-lg">Passenger Volume</h3>
                  <div className="flex flex-wrap gap-2">
                    <select 
                      value={volYear}
                      onChange={(e) => {
                        setVolYear(e.target.value);
                        if (!e.target.value) { setVolMonth(''); setVolDay(''); }
                      }}
                      className="bg-slate-50 border-none text-xs rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <option value="">Last 30 Days</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>

                    {volYear && (
                      <select 
                        value={volMonth}
                        onChange={(e) => {
                          setVolMonth(e.target.value);
                          if (!e.target.value) setVolDay('');
                        }}
                        className="bg-slate-50 border-none text-xs rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <option value="">All Months</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM')}</option>
                        ))}
                      </select>
                    )}

                    {volYear && volMonth && (
                      <select 
                        value={volDay}
                        onChange={(e) => setVolDay(e.target.value)}
                        className="bg-slate-50 border-none text-xs rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <option value="">All Days</option>
                        {Array.from({ length: 31 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyStats}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b'}}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      />
                      <Area type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Pattern */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">Weekday vs Weekend Usage</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={weeklyPatterns}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="day_type"
                      >
                        {weeklyPatterns.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {weeklyPatterns.map((entry, index) => (
                    <div key={entry.day_type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-slate-500">{entry.day_type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak Hours */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">Peak Travel Hours</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}}
                        tickFormatter={(val) => `${val}:00`}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Station Flow */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="font-bold text-lg mb-6">Station Flow Analysis (Boarding vs Drop-off)</h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stationFlow}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      />
                      <Bar dataKey="boarding" fill="#1d4ed8" name="Boarding (Pickup)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dropoff" fill="#10b981" name="Drop-off (Destination)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by Passenger ID, Mobile or Station..." 
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Passenger Details</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Distance</th>
                    <th className="px-6 py-4">Fare</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((trip: any) => (
                    <tr key={trip.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{trip.passenger_name}</div>
                        <button 
                          onClick={() => setSelectedPassengerId(trip.passenger_id)}
                          className="text-xs text-blue-600 hover:underline font-mono"
                        >
                          {trip.passenger_id}
                        </button>
                        <span className="text-xs text-slate-400 font-mono ml-2">| {trip.passenger_mobile}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{trip.start_station}</span>
                          <ArrowRightLeft size={14} className="text-slate-300" />
                          <span className="font-medium">{trip.end_station}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{(trip.distance ?? 0).toFixed(1)} km</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">₹{(trip.fare ?? 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {format(new Date(trip.timestamp), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <div className="relative group/qr">
                            <button className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-700 transition-all">
                              <QrCode size={18} />
                            </button>
                            <div className="absolute right-0 top-full mt-2 hidden group-hover/qr:block z-10 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xl">
                              <QRCodeSVG value={`CMRL-${trip.id}-${trip.passenger_id}`} size={120} />
                              <p className="text-[10px] text-center mt-2 font-mono text-slate-400 uppercase tracking-widest">CMRL Verified</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handlePrint(trip.passenger_id, 'trips')}
                            className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all"
                            title="Print Journey History"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by Name, ID or Mobile..." 
                  value={transSearch}
                  onChange={(e) => setTransSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Scan QR to Quick Recharge (₹100)
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Passenger ID</th>
                    <th className="px-6 py-4">Passenger Name</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4">Recharge QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedPassengerId(tx.passenger_id)}
                          className="font-mono text-sm text-blue-600 font-bold hover:underline"
                        >
                          {tx.passenger_id}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{tx.passenger_name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono">
                        {tx.passenger_mobile}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative group/qr-mini">
                            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 transition-all">
                              <QRCodeSVG value={`RECHARGE-${tx.passenger_id}`} size={40} />
                            </div>
                            {/* Hover Preview */}
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/qr-mini:block z-10 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xl">
                              <QRCodeSVG value={`RECHARGE-${tx.passenger_id}`} size={120} />
                              <p className="text-[10px] text-center mt-2 font-mono text-slate-400 uppercase tracking-widest">Scan to Pay ₹100</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleQuickQRRecharge(tx.passenger_id)}
                            className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            <QrCode size={14} />
                            Simulate Scan
                          </button>
                          <button 
                            onClick={() => handlePrint(tx.passenger_id, 'transactions')}
                            className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all"
                            title="Print Wallet Transactions"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'etl' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* ETL Control */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-2xl">
                      <Database className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">Pipeline Controller</h3>
                      <p className="text-slate-500">Automated Data Migration & ETL Engine</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Automated Sync: Active
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-slate-700">Migration Progress</span>
                      <span className="text-blue-600 font-bold">{etlProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300" 
                        style={{ width: `${etlProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Extracted</p>
                      <p className="text-xl font-bold text-emerald-900">1,240</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Transformed</p>
                      <p className="text-xl font-bold text-blue-900">1,240</p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Validated</p>
                      <p className="text-xl font-bold text-amber-900">1,238</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      Manual Migration Parameters
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
                        <select 
                          value={etlYear} 
                          onChange={(e) => setEtlYear(parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
                        <select 
                          value={etlMonth} 
                          onChange={(e) => setEtlMonth(parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label>
                        <select 
                          value={etlDay} 
                          onChange={(e) => setEtlDay(parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={runETL}
                      disabled={etlStatus === 'running'}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {etlStatus === 'running' ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
                      {etlStatus === 'running' ? 'Processing Pipeline...' : 'Run ETL Pipeline'}
                    </button>
                    <button className="px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              {/* ETL Logs */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">Pipeline Logs</h3>
                <div className="space-y-4 font-mono text-sm">
                  <LogItem time="09:22:01" type="success" msg="Connected to Source: Station_A_API" />
                  <LogItem time="09:22:05" type="success" msg="Extracted 450 records from Daily_Transactions" />
                  <LogItem time="09:22:10" type="info" msg="Applying Transformation: Fare_Calculation_Logic" />
                  <LogItem time="09:22:15" type="warning" msg="Validation Warning: Missing End_Station for ID METRO-1045 (Auto-filled)" />
                  <LogItem time="09:22:20" type="success" msg="Load Complete: 450 records inserted into Trips table" />
                  {etlStatus === 'completed' && (
                    <LogItem time="Now" type="success" msg="Manual ETL Trigger: Pipeline run successful" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Data Quality */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">Data Quality Score</h3>
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle cx="64" cy="64" r="58" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="364" strokeDashoffset="36" />
                    </svg>
                    <span className="absolute text-2xl font-bold text-slate-800">98.4%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <QualityMetric label="Completeness" value={100} />
                  <QualityMetric label="Accuracy" value={97} />
                  <QualityMetric label="Consistency" value={98} />
                </div>
              </div>

              {/* Schema Info */}
              <div className="bg-slate-900 p-8 rounded-3xl text-white">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Database size={20} className="text-blue-400" />
                  SQL Schema
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Table: Trips</p>
                    <ul className="space-y-1 text-slate-300">
                      <li>id: INTEGER (PK)</li>
                      <li>passenger_id: TEXT (FK)</li>
                      <li>fare: REAL</li>
                      <li>distance: REAL</li>
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">ETL Logic</p>
                    <p className="text-slate-300 leading-relaxed italic">
                      "Fare = MAX(10, distance * 2.5) calculated during the Transformation phase."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Passenger Detail Modal */}
      {selectedPassengerId && passengerDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start">
              <div className="flex gap-6 items-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-3xl flex items-center justify-center text-3xl font-bold">
                  {passengerDetails.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{passengerDetails.name}</h3>
                  <p className="text-slate-500 font-mono">{passengerDetails.id} • {passengerDetails.mobile}</p>
                  <div className="flex gap-4 mt-2">
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">
                      Balance: ₹{(passengerDetails.wallet_balance ?? 0).toFixed(2)}
                    </div>
                    <button 
                      onClick={() => setIsRechargeModalOpen(true)}
                      className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
                    >
                      Recharge Wallet
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPassengerId(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
              >
                <RefreshCw className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <h4 className="font-bold text-lg mb-6">Transaction History (Credit & Debit)</h4>
              <div className="space-y-4">
                {passengerTransactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                    <div className="flex gap-4 items-center">
                      <div className={`p-2 rounded-xl ${tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        <TrendingUp size={20} className={tx.type === 'DEBIT' ? 'rotate-180' : ''} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{tx.description}</p>
                        <p className="text-xs text-slate-400">{format(new Date(tx.timestamp), 'PPP p')}</p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₹{(tx.amount ?? 0).toFixed(2)}
                    </div>
                  </div>
                ))}
                {passengerTransactions.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic">
                    No transactions found for this passenger.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-2">Recharge Wallet</h3>
            <p className="text-slate-500 mb-6">Add funds to {passengerDetails?.name}'s account.</p>
            
            {rechargeStep === 1 ? (
              <form onSubmit={handleRecharge} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="Enter amount (e.g. 100)"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-bold"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {[100, 200, 500].map(amt => (
                    <button 
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt.toString())}
                      className="py-2 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-bold"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRechargeModalOpen(false);
                      setRechargeStep(1);
                    }}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center">
                  <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">Scan to Pay ₹{rechargeAmount}</p>
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                    <QRCodeSVG 
                      value={`upi://pay?pa=cmrl@upi&pn=Chennai%20Metro&am=${rechargeAmount}&cu=INR`} 
                      size={180} 
                    />
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 text-sm font-mono text-slate-600">
                    UPI ID: <span className="font-bold text-blue-600">cmrl@upi</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setRechargeStep(1)}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={confirmPayment}
                    disabled={rechargeLoading}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {rechargeLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Payment Completed'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recharge Success Modal */}
      {showRechargeSuccess && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Recharge Successful!</h3>
            <p className="text-slate-500 mb-8">₹100 has been added to {showRechargeSuccess.name}'s wallet.</p>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 flex flex-col items-center">
              <QRCodeSVG value={`RECHARGE-${showRechargeSuccess.id}`} size={140} />
              <p className="text-[10px] text-slate-400 font-mono mt-4 uppercase tracking-widest">Passenger ID: {showRechargeSuccess.id}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => handlePrint(showRechargeSuccess.id, 'transactions')}
                className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
              <button 
                onClick={() => setShowRechargeSuccess(null)}
                className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl">
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
          {trend}
        </span>
      </div>
      <h4 className="text-slate-500 text-sm font-medium">{title}</h4>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function LogItem({ time, type, msg }: { time: string, type: 'success' | 'info' | 'warning' | 'error', msg: string }) {
  const colors = {
    success: 'text-emerald-500',
    info: 'text-blue-500',
    warning: 'text-amber-500',
    error: 'text-red-500'
  };
  
  const icons = {
    success: <CheckCircle2 size={14} />,
    info: <AlertCircle size={14} />,
    warning: <AlertCircle size={14} />,
    error: <AlertCircle size={14} />
  };

  return (
    <div className="flex gap-3 items-start group">
      <span className="text-slate-400 whitespace-nowrap">[{time}]</span>
      <span className={`${colors[type]} mt-1`}>{icons[type]}</span>
      <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{msg}</span>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string, value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-slate-700">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div className="bg-emerald-500 h-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
