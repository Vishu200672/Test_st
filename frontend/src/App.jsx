import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, History, Brain, Send, CheckCircle, Clock } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [activeTab, setActiveTab] = useState('clients');
  const [newClient, setNewClient] = useState({ name: '', industry: '', preferences: '' });
  const [newProposalReq, setNewProposalReq] = useState({ client_id: '', topic: '' });
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchProposals();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/proposals/`);
      setProposals(response.data);
    } catch (error) {
      console.error('Error fetching proposals', error);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/clients/`, newClient);
      setNewClient({ name: '', industry: '', preferences: '' });
      fetchClients();
    } catch (error) {
      console.error('Error creating client', error);
    }
  };

  const handleGenerateProposal = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-proposal/`, {
        client_id: parseInt(newProposalReq.client_id),
        topic: newProposalReq.topic
      });
      setGeneratedProposal(response.data);
    } catch (error) {
      console.error('Error generating proposal', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProposal = async () => {
    if (!generatedProposal) return;
    try {
      await axios.post(`${API_BASE_URL}/proposals/`, {
        title: generatedProposal.title,
        content: generatedProposal.content,
        client_id: parseInt(newProposalReq.client_id),
        status: 'draft'
      });
      setGeneratedProposal(null);
      setNewProposalReq({ client_id: '', topic: '' });
      fetchProposals();
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving proposal', error);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`${API_BASE_URL}/proposals/${id}?status=${status}`);
      fetchProposals();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <div className="flex h-screen">
        <aside className="w-64 bg-indigo-900 text-white p-6">
          <div className="flex items-center gap-2 mb-10">
            <Brain className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight">Proposal Agent</h1>
          </div>

          <nav className="space-y-4">
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-3 w-full p-3 rounded-lg transition ${activeTab === 'clients' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Clients</span>
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-3 w-full p-3 rounded-lg transition ${activeTab === 'generate' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
              <Send className="w-5 h-5" />
              <span>Generate</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-3 w-full p-3 rounded-lg transition ${activeTab === 'history' ? 'bg-indigo-700' : 'hover:bg-indigo-800'}`}
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-10">
          {activeTab === 'clients' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Client Management</h2>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-10">
                <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
                <form onSubmit={handleCreateClient} className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Company Name"
                    className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                    required
                  />
                  <input
                    placeholder="Industry"
                    className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.industry}
                    onChange={e => setNewClient({...newClient, industry: e.target.value})}
                    required
                  />
                  <textarea
                    placeholder="Client Preferences"
                    className="p-3 border rounded-lg col-span-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.preferences}
                    onChange={e => setNewClient({...newClient, preferences: e.target.value})}
                  />
                  <button type="submit" className="bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                    Add Client
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clients.map(client => (
                  <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xl font-bold text-indigo-900">{client.name}</h4>
                    <span className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold mt-2">
                      {client.industry}
                    </span>
                    <p className="mt-4 text-gray-600 text-sm line-clamp-2">
                      {client.preferences || 'No preferences listed.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Generate Proposal</h2>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-10">
                <form onSubmit={handleGenerateProposal} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Client</label>
                    <select
                      className="w-full p-3 border rounded-lg outline-none"
                      value={newProposalReq.client_id}
                      onChange={e => setNewProposalReq({...newProposalReq, client_id: e.target.value})}
                      required
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Proposal Topic/Title</label>
                    <input
                      placeholder="e.g., Cloud Migration Strategy"
                      className="w-full p-3 border rounded-lg outline-none"
                      value={newProposalReq.topic}
                      onChange={e => setNewProposalReq({...newProposalReq, topic: e.target.value})}
                      required
                    />
                  </div>
                  <button
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    <Brain className="w-5 h-5" />
                    {loading ? 'Analyzing Past Successes...' : 'Generate AI Proposal'}
                  </button>
                </form>
              </div>

              {generatedProposal && (
                <div className="bg-indigo-50 p-8 rounded-xl border-2 border-indigo-200 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-indigo-900">{generatedProposal.title}</h3>
                      {generatedProposal.memory_used && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                          <CheckCircle className="w-4 h-4" /> Organizational memory applied
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleSaveProposal}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                    >
                      Save to Drafts
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-gray-700 font-sans leading-relaxed">
                    {generatedProposal.content}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Proposal History</h2>

              <div className="space-y-4">
                {proposals.length === 0 && <p className="text-gray-500">No proposals generated yet.</p>}
                {proposals.map(proposal => (
                  <div key={proposal.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-bold">{proposal.title}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> ID: {proposal.id}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                          proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                          proposal.status === 'lost' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {proposal.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {proposal.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(proposal.id, 'won')}
                            className="text-xs bg-green-50 text-green-600 px-3 py-2 rounded font-bold hover:bg-green-100"
                          >
                            Mark Won
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(proposal.id, 'lost')}
                            className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded font-bold hover:bg-red-100"
                          >
                            Mark Lost
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
