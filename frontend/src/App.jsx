import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PlusCircle, Brain, Clock, Sparkles, TrendingUp, Database, Shield, 
  FileText, Users, Award, DollarSign, Search, ArrowRight, AlertTriangle, 
  Trash2, Activity, Briefcase, X, Check, AlertCircle, Sun, Moon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  // --- Core State ---
  const [companies, setCompanies] = useState([]);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  // --- Authentication States ---
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('tendx_session_token') || '');
  const [loggedInUser, setLoggedInUser] = useState(JSON.parse(localStorage.getItem('tendx_user_details') || 'null'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCompanyId, setLoginCompanyId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Derived Tenant & Role States (Avoids synchronous setState inside effects) ---
  const currentCompany = companies.find(c => c.id === currentCompanyId) || null;
  const currentUser = users.find(u => u.id === currentUserId) || null;
  const currentRole = currentUser ? currentUser.role_level : 'PROPOSAL_MANAGER';

  // --- Data States ---
  const [knowledgeNodes, setKnowledgeNodes] = useState([]);
  const [rfps, setRfps] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [tasks, setTasks] = useState([]);

  // --- UI States ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wsConnected, setWsConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // --- Theme State ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Dynamic Chart styling parameters based on current active theme
  const chartTickColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const chartStrokeColor = theme === 'dark' ? '#334155' : '#cbd5e1';
  const chartGridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  // --- Selection / Edit Drawer States ---
  const [activeProposalId, setActiveProposalId] = useState(null);
  const [activeProposal, setActiveProposal] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [sectionContent, setSectionContent] = useState('');

  // --- Form States ---
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNode, setNewNode] = useState({
    category: 'CAPABILITY',
    title: '',
    content: '',
    tags: '',
    is_private: true
  });

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', domain: '', is_startup: false });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '', role_level: 'SME' });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    win_loss_outcome: true,
    evaluator_score: 8.5,
    evaluator_comments: ''
  });

  const [rfpUploadFile, setRfpUploadFile] = useState(null);
  const [rfpUploadMeta, setRfpUploadMeta] = useState({ title: '', issuer: '', due_days: 30 });
  const [uploadingRfp, setUploadingRfp] = useState(false);
  const [uploadLogs, setUploadLogs] = useState([]);

  // --- Competitor Form ---
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', market_segment: '', capability_limits: '', pricing_strategy: '' });

  // --- Helper: Notification Toast ---
  const triggerToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Axios Authorization Token Header Sync ---
  useEffect(() => {
    if (sessionToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [sessionToken]);

  // --- Initial Ingestion ---
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const compsRes = await axios.get(`${API_BASE_URL}/companies/`);
        setCompanies(compsRes.data);
        if (compsRes.data.length > 0) {
          const corp = compsRes.data.find(c => c.domain === 'enterprisecorp.com') || compsRes.data[0];
          setLoginCompanyId(corp.id);
          
          if (loggedInUser) {
            setCurrentCompanyId(loggedInUser.company_id);
            setCurrentUserId(loggedInUser.user_id);
          } else {
            setCurrentCompanyId(corp.id);
          }
        }
      } catch (err) {
        console.error('Error fetching companies', err);
        triggerToast('Failed to connect to backend API server.', 'error');
      }
    };
    fetchInitial();
  }, []);

  // --- Refetch when Current Company Changes ---
  useEffect(() => {
    if (!currentCompanyId) return;

    const fetchTenantData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Users
        const usersRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/users/`);
        setUsers(usersRes.data);
        if (loggedInUser && loggedInUser.company_id === currentCompanyId) {
          setCurrentUserId(loggedInUser.user_id);
        } else if (usersRes.data.length > 0) {
          const mgr = usersRes.data.find(u => u.role_level === 'PROPOSAL_MANAGER') || usersRes.data[0];
          setCurrentUserId(mgr.id);
        } else {
          setCurrentUserId('');
        }

        // 2. Fetch Knowledge
        const knRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/knowledge/`);
        setKnowledgeNodes(knRes.data);

        // 3. Fetch RFPs
        const rfpRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/rfps/`);
        setRfps(rfpRes.data);

        // 4. Fetch Proposal Projects
        const propRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/proposals-enterprise/`);
        setProposals(propRes.data);

        // 5. Fetch Competitors
        const compRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/competitors/`);
        setCompetitors(compRes.data);

        // 6. Fetch Tasks
        const taskRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/tasks/`);
        setTasks(taskRes.data);

      } catch (err) {
        console.error('Error fetching tenant isolated data', err);
        triggerToast('Error synchronizing tenant database.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [currentCompanyId]);

  // --- Authentication Handlers ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      setLoginError("Verification Failed: Invalid email address format.");
      setLoginLoading(false);
      return;
    }

    if (loginPassword.length < 8) {
      setLoginError("Verification Failed: Password must be at least 8 characters long.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });

      const tokenData = res.data;
      
      if (tokenData.company_id !== loginCompanyId) {
        setLoginError("Verification Failed: This account is not registered to the selected company domain.");
        setLoginLoading(false);
        return;
      }

      setSessionToken(tokenData.access_token);
      setLoggedInUser(tokenData);
      setCurrentCompanyId(tokenData.company_id);
      setCurrentUserId(tokenData.user_id);

      localStorage.setItem('tendx_session_token', tokenData.access_token);
      localStorage.setItem('tendx_user_details', JSON.stringify(tokenData));

      triggerToast(`Authenticated successfully. Welcome back, ${tokenData.first_name}!`);
    } catch (err) {
      console.error(err);
      setLoginError(err.response?.data?.detail || "Authentication Failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await axios.post(`${API_BASE_URL}/auth/logout?token=${sessionToken}`);
      }
    } catch (err) {
      console.error("Logout API call failed", err);
    } finally {
      localStorage.removeItem('tendx_session_token');
      localStorage.removeItem('tendx_user_details');
      setSessionToken('');
      setLoggedInUser(null);
      setCurrentUserId('');
      setLoginEmail('');
      setLoginPassword('');
      triggerToast("Logged out successfully. Session revoked.");
    }
  };

  // --- User Selection Change ---
  const handleUserChange = (uId) => {
    setCurrentUserId(uId);
    const userObj = users.find(u => u.id === uId);
    if (userObj) {
      triggerToast(`Switched user context to ${userObj.first_name} (${userObj.role_level})`);
    }
  };

  // --- Company Form Submit ---
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/companies/`, newCompany);
      setCompanies([...companies, res.data]);
      setCurrentCompanyId(res.data.id);
      setShowAddCompanyModal(false);
      setNewCompany({ name: '', domain: '', is_startup: false });
      triggerToast(`Company '${res.data.name}' registered successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.detail || 'Failed to create company.', 'error');
    }
  };

  // --- User Form Submit ---
  const handleCreateUser = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      triggerToast("Verification Failed: Invalid email format.", "error");
      return;
    }

    const pwd = newUser.password || '';
    if (pwd.length < 8) {
      triggerToast("Verification Failed: Password must be at least 8 characters long.", "error");
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      triggerToast("Verification Failed: Password must contain at least one uppercase letter.", "error");
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      triggerToast("Verification Failed: Password must contain at least one lowercase letter.", "error");
      return;
    }
    if (!/\d/.test(pwd)) {
      triggerToast("Verification Failed: Password must contain at least one digit.", "error");
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) {
      triggerToast("Verification Failed: Password must contain at least one special character.", "error");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/users/`, {
        ...newUser,
        company_id: currentCompanyId
      });
      setUsers([...users, res.data]);
      setShowAddUserModal(false);
      setNewUser({ email: '', first_name: '', last_name: '', role_level: 'SME', password: '' });
      triggerToast(`User '${res.data.first_name}' added to tenant.`);
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.detail || 'Failed to add user.', 'error');
    }
  };

  // --- Knowledge Node CRUD ---
  const handleCreateKnowledgeNode = async (e) => {
    e.preventDefault();
    try {
      const metadata = { tags: newNode.tags.split(',').map(t => t.trim()).filter(Boolean) };
      const res = await axios.post(`${API_BASE_URL}/knowledge/`, {
        category: newNode.category,
        title: newNode.title,
        content: newNode.content,
        metadata_json: JSON.stringify(metadata),
        is_private: newNode.is_private,
        company_id: currentCompanyId
      });
      setKnowledgeNodes([res.data, ...knowledgeNodes]);
      setShowAddNodeModal(false);
      setNewNode({ category: 'CAPABILITY', title: '', content: '', tags: '', is_private: true });
      triggerToast('Organizational memory node ingested.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to ingest knowledge node.', 'error');
    }
  };

  const handleDeleteKnowledgeNode = async (id) => {
    if (!window.confirm('Are you sure you want to purge this memory block?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/knowledge/${id}`);
      setKnowledgeNodes(knowledgeNodes.filter(n => n.id !== id));
      triggerToast('Knowledge node purged.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to delete node.', 'error');
    }
  };

  // --- Ingest RFP (Mock PDF Upload Workflow) ---
  const handleRfpUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadingRfp(true);
    setUploadLogs([]);
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Simulate multi-agent workflow parsing
    try {
      setUploadLogs(l => [...l, "Initiating multi-agent ingestion pipeline..."]);
      await sleep(1000);
      setUploadLogs(l => [...l, "Parsing file structure via layout-aware LlamaParse agent..."]);
      await sleep(1200);
      setUploadLogs(l => [...l, "Extracted raw paragraphs and tabular matrices..."]);
      await sleep(1000);
      setUploadLogs(l => [...l, "RFP Analyzer Agent: Extracting compliance requirement matrices..."]);
      await sleep(1500);
      setUploadLogs(l => [...l, "Identified 3 core requirements (REQ-TECH-01, REQ-SEC-02, REQ-INT-03)..."]);
      await sleep(1000);
      setUploadLogs(l => [...l, "Ethics Competitor Agent: Correlating competitor bid patterns..."]);
      await sleep(1200);
      setUploadLogs(l => [...l, "Cognitive RAG: Mapping requirements against organization memory..."]);
      await sleep(1000);
      setUploadLogs(l => [...l, "Completed successfully. Building proposal workspace..."]);
      await sleep(800);

      // Call API
      const rfpTitle = rfpUploadMeta.title || (rfpUploadFile ? rfpUploadFile.name.replace(/\.[^/.]+$/, "") : "Incoming Bid Request");
      const res = await axios.post(`${API_BASE_URL}/rfps/`, {
        title: rfpTitle,
        issuer: rfpUploadMeta.issuer || "Unknown Issuer",
        due_date: new Date(Date.now() + rfpUploadMeta.due_days * 24 * 60 * 60 * 1000).toISOString(),
        raw_document_url: "https://s3.amazonaws.com/uploads/" + (rfpUploadFile ? rfpUploadFile.name : "bid_file.pdf"),
        company_id: currentCompanyId
      });

      // Update States
      setRfps([res.data, ...rfps]);
      
      // Refresh Proposals & Tasks since RFP creation automatically generates a proposal project & task log
      const propRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/proposals-enterprise/`);
      setProposals(propRes.data);
      const taskRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/tasks/`);
      setTasks(taskRes.data);

      setRfpUploadFile(null);
      setRfpUploadMeta({ title: '', issuer: '', due_days: 30 });
      triggerToast('RFP parsed and proposal project initialized!');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to ingest RFP.', 'error');
    } finally {
      setUploadingRfp(false);
    }
  };

  // --- Proposal Workspace Editor Actions ---
  const handleSelectProposal = async (id) => {
    setActiveProposalId(id);
    try {
      const res = await axios.get(`${API_BASE_URL}/proposals-enterprise/${id}`);
      setActiveProposal(res.data);
      if (res.data.sections.length > 0) {
        // Select first section
        const firstSec = res.data.sections[0];
        setSelectedSectionId(firstSec.id);
        setSectionContent(firstSec.content);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load proposal details.', 'error');
    }
  };

  const handleSelectSection = (sec) => {
    setSelectedSectionId(sec.id);
    setSectionContent(sec.content);
  };

  const handleSaveSection = async () => {
    if (!activeProposalId || !selectedSectionId) return;
    const currentSec = activeProposal.sections.find(s => s.id === selectedSectionId);
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/proposals-enterprise/${activeProposalId}/sections/${selectedSectionId}`,
        {
          title: currentSec.title,
          order_index: currentSec.order_index,
          content: sectionContent,
          assigned_to: currentSec.assigned_to,
          status: currentSec.status
        }
      );
      
      // Update activeProposal state
      const updatedSections = activeProposal.sections.map(s => s.id === selectedSectionId ? res.data : s);
      setActiveProposal({ ...activeProposal, sections: updatedSections });
      triggerToast('Draft saved successfully.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save section content.', 'error');
    }
  };

  const handleAssignSme = async (smeId) => {
    if (!activeProposalId || !selectedSectionId) return;
    const currentSec = activeProposal.sections.find(s => s.id === selectedSectionId);
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/proposals-enterprise/${activeProposalId}/sections/${selectedSectionId}`,
        {
          ...currentSec,
          assigned_to: smeId
        }
      );
      const updatedSections = activeProposal.sections.map(s => s.id === selectedSectionId ? res.data : s);
      setActiveProposal({ ...activeProposal, sections: updatedSections });
      triggerToast('Assigned section to Subject Matter Expert.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSectionStatus = async (newStatus) => {
    if (!activeProposalId || !selectedSectionId) return;
    const currentSec = activeProposal.sections.find(s => s.id === selectedSectionId);
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/proposals-enterprise/${activeProposalId}/sections/${selectedSectionId}`,
        {
          ...currentSec,
          status: newStatus
        }
      );
      const updatedSections = activeProposal.sections.map(s => s.id === selectedSectionId ? res.data : s);
      setActiveProposal({ ...activeProposal, sections: updatedSections });
      triggerToast(`Section status set to ${newStatus}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSectionReviewSubmit = async (status) => {
    if (!activeProposalId || !selectedSectionId || !currentUserId) {
      triggerToast('Please select a user context first in settings.', 'error');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/proposals-enterprise/${activeProposalId}/reviews`, {
        section_id: selectedSectionId,
        reviewer_id: currentUserId,
        comments: status === 'APPROVED' ? 'Looks great! Facts cross-referenced and verified.' : 'Requires correction. Please expand technical architecture.',
        status: status
      });
      
      // Reload proposal
      handleSelectProposal(activeProposalId);
      triggerToast(`Review submitted: Section ${status}`);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to submit section review.', 'error');
    }
  };

  // --- AI Assist mock operations ---
  const handleAiAssist = async (actionType) => {
    if (!sectionContent) return;
    setLoading(true);
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      await sleep(1500); // Simulate network latency
      let modifiedText = sectionContent;
      if (actionType === 'improve') {
        modifiedText = `[AI Improved Tone]\n\n${sectionContent}\n\n*Optimized for active enterprise credentials, clear compliance alignment, and technical reliability.*`;
        triggerToast('AI adjusted tone to Enterprise SaaS style.');
      } else if (actionType === 'fill') {
        // Retrieve some knowledge content to ground response
        let sourceNode = knowledgeNodes.find(n => n.title.toLowerCase().includes('telematics') || n.title.toLowerCase().includes('soc 2') || n.title.toLowerCase().includes('fedex'));
        if (!sourceNode && knowledgeNodes.length > 0) sourceNode = knowledgeNodes[0];

        modifiedText = `[AI Auto-Generated Draft Section]\n\n${sectionContent}\n\nOur solution leverages our proven capabilities: "${sourceNode ? sourceNode.content : 'High-availability architecture and secure endpoints'}" to deliver absolute compliance with the specifications.`;
        triggerToast('AI generated draft using organizational memory context.');
      } else if (actionType === 'qa') {
        // Run compliance check
        triggerToast('AI compliance agent verified section: 0 errors/hallucinations detected.');
      }
      setSectionContent(modifiedText);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Proposal Post-Mortem Feedback ---
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!activeProposalId) return;
    try {
      await axios.post(`${API_BASE_URL}/proposals-enterprise/${activeProposalId}/feedback`, {
        proposal_id: activeProposalId,
        win_loss_outcome: feedbackForm.win_loss_outcome,
        evaluator_score: feedbackForm.evaluator_score,
        evaluator_comments: feedbackForm.evaluator_comments
      });

      setShowFeedbackModal(false);
      setFeedbackForm({ win_loss_outcome: true, evaluator_score: 8.5, evaluator_comments: '' });
      
      // Refresh Proposals & Tasks
      const propRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/proposals-enterprise/`);
      setProposals(propRes.data);
      const taskRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/tasks/`);
      setTasks(taskRes.data);
      
      // Update local editor object if currently open
      handleSelectProposal(activeProposalId);

      triggerToast('Outcome feedback saved. AI Learning Loop task executed in background.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save feedback.', 'error');
    }
  };

  // --- Competitor Creation ---
  const handleCreateCompetitor = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/competitors/`, {
        name: newCompetitor.name,
        market_segment: newCompetitor.market_segment,
        company_id: currentCompanyId
      });

      await axios.post(`${API_BASE_URL}/competitors/${res.data.id}/insights`, {
        competitor_id: res.data.id,
        capability_limits: JSON.stringify(newCompetitor.capability_limits.split(',').map(i => i.trim()).filter(Boolean)),
        pricing_strategy: newCompetitor.pricing_strategy
      });

      setShowAddCompetitor(false);
      setNewCompetitor({ name: '', market_segment: '', capability_limits: '', pricing_strategy: '' });
      
      // Refresh competitors
      const compRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/competitors/`);
      setCompetitors(compRes.data);
      triggerToast('Competitor insight filed.');
    } catch (err) {
      console.error(err);
    }
  };

  // --- Manual AI Task Triggering ---
  const triggerManualAgentTask = async (agentType) => {
    setLoading(true);
    let payload = "{}";
    if (agentType === "LEARNING_AGENT") {
      payload = JSON.stringify({ adjust_semantic_weights: true, target_category: "CAPABILITY" });
    } else if (agentType === "COMPLIANCE_QA") {
      payload = JSON.stringify({ audit_proposals: true, tenant_domain: currentCompany?.domain });
    } else if (agentType === "RFP_ANALYZER") {
      payload = JSON.stringify({ scrape_domain: currentCompany?.domain, depth: 3 });
    }

    try {
      await axios.post(`${API_BASE_URL}/companies/${currentCompanyId}/tasks/`, {
        agent_type: agentType,
        payload: payload,
        company_id: currentCompanyId
      });
      // Refresh tasks
      const taskRes = await axios.get(`${API_BASE_URL}/companies/${currentCompanyId}/tasks/`);
      setTasks(taskRes.data);
      triggerToast(`AI ${agentType} task finished execution.`);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to run AI agent task.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Charts Formatting & Math ---
  const getProposalChartData = () => {
    return proposals.map(p => {
      const rfpObj = rfps.find(r => r.id === p.rfp_id);
      const prob = rfpObj?.analyses?.[0]?.win_probability_score || 0.65;
      return {
        name: p.title.length > 22 ? p.title.substring(0, 22) + '...' : p.title,
        probability: Math.round(prob * 100)
      };
    });
  };

  const getMemoryCategoryCounts = () => {
    const counts = {
      COMPANY_PROFILE: 0,
      CAPABILITY: 0,
      CASE_STUDY: 0,
      TEAM_EXPERTISE: 0,
      COMPLIANCE: 0,
      PRICING_FRAMEWORK: 0
    };
    knowledgeNodes.forEach(n => {
      if (counts[n.category] !== undefined) counts[n.category]++;
    });
    return Object.keys(counts).map(key => ({
      name: key.replace('_', ' '),
      count: counts[key],
      color: key === 'COMPLIANCE' ? '#e11d48' : key === 'CAPABILITY' ? '#4f46e5' : key === 'CASE_STUDY' ? '#16a34a' : '#475569'
    }));
  };

  // Calculate high-level stats
  const totalBids = proposals.length;
  const wonBids = proposals.filter(p => p.status === 'WON').length;
  const lostBids = proposals.filter(p => p.status === 'LOST').length;
  const winRate = totalBids > 0 ? Math.round((wonBids / (wonBids + lostBids || 1)) * 100) : 75;
  const activeProposals = proposals.filter(p => p.status === 'DRAFT' || p.status === 'UNDER_REVIEW').length;
  const totalValue = totalBids * 135000; // Mock average bid value

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Decorative Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/20 blur-[120px]"></div>

        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 text-white animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center mb-3">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text text-transparent">TendX</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">SaaS Proposal Cognitive Engine</p>
          </div>

          <h2 className="text-xl font-bold text-center mb-6">Sign In to Your Workspace</h2>

          {loginError && (
            <div className="bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs p-4 rounded-xl mb-6 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company / Tenant Domain</label>
              <select
                value={loginCompanyId}
                onChange={e => setLoginCompanyId(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-white/10 rounded-xl outline-none text-sm text-slate-100 focus:border-indigo-500 cursor-pointer"
                disabled={companies.length === 0}
              >
                {companies.length === 0 && <option value="">Loading domains...</option>}
                {companies.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100 font-semibold">
                    {c.name} ({c.domain})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                placeholder="email@enterprisecorp.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-slate-100 focus:border-indigo-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-slate-100 focus:border-indigo-500 font-semibold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-white/5 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Default Seed Credentials</span>
            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div>Email: <span className="text-slate-200">manager@enterprisecorp.com</span></div>
              <div>Password: <span className="text-slate-200">Password123!</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 mesh-gradient text-slate-800 font-sans flex flex-col antialiased">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border ${
          notification.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Sparkles className="w-5 h-5 text-indigo-600" />}
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-slate-200/50 px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-sm shadow-slate-100/50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">TendX</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">SaaS Cognitive Proposal Engine</p>
          </div>
        </div>

        {/* Tenant Switching & Role Gates */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Tenant Selector */}
          <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/40">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <select 
              value={currentCompanyId} 
              onChange={e => setCurrentCompanyId(e.target.value)}
              className="bg-transparent font-semibold text-sm outline-none text-slate-700 pr-2 cursor-pointer"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-white text-slate-800">
                  {c.name} {c.is_startup ? '🚀' : '🏢'}
                </option>
              ))}
            </select>
            <button 
              onClick={() => setShowAddCompanyModal(true)}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold pl-1 border-l border-slate-200"
              title="Add New Tenant Company"
            >
              + New
            </button>
          </div>

          {/* Active Session & Logout */}
          <div className="flex items-center gap-2.5 bg-indigo-50/85 px-3.5 py-1.5 rounded-xl border border-indigo-100/40 shadow-sm shadow-indigo-100/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
              <span>{loggedInUser?.first_name} {loggedInUser?.last_name}</span>
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-700 text-[9px] uppercase tracking-wider font-extrabold border border-indigo-100">
                {loggedInUser?.role_level}
              </span>
            </div>
            {(loggedInUser?.role_level === 'SUPER_ADMIN' || loggedInUser?.role_level === 'ENTERPRISE_ADMIN' || loggedInUser?.role_level === 'PROPOSAL_MANAGER') && (
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold pl-2.5 border-l border-indigo-100 cursor-pointer"
                title="Add User to Tenant"
              >
                + Add User
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-800 text-xs font-black pl-3 border-l border-indigo-100/50 cursor-pointer transition duration-150"
              title="Sign Out of Secure Session"
            >
              Sign Out
            </button>
          </div>

          {/* Theme Toggle Switch */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-slate-200/40 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition duration-150 flex items-center justify-center cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

          {/* WebSocket / Agent Active status */}
          <div 
            onClick={() => setWsConnected(!wsConnected)}
            className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-emerald-800 text-[11px] font-bold cursor-pointer relative"
          >
            <span className={`w-2 h-2 rounded-full bg-emerald-500 ${wsConnected ? 'animate-ping' : ''}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-rose-500'} absolute`}></span>
            <span className="pl-3.5">WS {wsConnected ? 'CONNECTED' : 'MOCK STATE'}</span>
          </div>
        </div>
      </header>

      {/* Visual Loader Overlay */}
      {loading && (
        <div className="h-1 bg-indigo-100 w-full overflow-hidden">
          <div className="h-full bg-indigo-600 animate-pulse w-1/3 rounded"></div>
        </div>
      )}

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- SIDEBAR --- */}
        <aside className="w-64 backdrop-blur-md bg-slate-900/95 border-r border-slate-800 text-slate-300 p-6 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Primary Modules</div>
            <nav className="space-y-1.5">
              <button
                onClick={() => { setActiveTab('dashboard'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Executive Analytics</span>
              </button>

              <button
                onClick={() => { setActiveTab('memory'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'memory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Organizational Memory</span>
              </button>

              <button
                onClick={() => { setActiveTab('rfp'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'rfp' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>RFP Management</span>
              </button>

              <button
                onClick={() => { setActiveTab('proposal'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'proposal' || activeProposalId !== null ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Proposal Workspace</span>
              </button>

              <button
                onClick={() => { setActiveTab('competitors'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'competitors' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Competitor Intel</span>
              </button>

              <button
                onClick={() => { setActiveTab('tasks'); setActiveProposalId(null); }}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="flex items-center justify-between w-full">
                  <span>AI Agent Console</span>
                  {tasks.filter(t => t.status === 'PROCESSING').length > 0 && (
                    <span className="bg-purple-600 text-[10px] text-white px-2 py-0.5 rounded-full animate-pulse">RUNNING</span>
                  )}
                </span>
              </button>
            </nav>
          </div>

          {/* Tenant Status Footer */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800/80">
            <div className="text-xs text-slate-400 mb-1">CURRENT TENANT</div>
            <div className="font-bold text-white text-sm truncate">{currentCompany?.name}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{currentCompany?.domain}</div>
            <div className="flex items-center gap-2 mt-3 text-xs text-indigo-400 font-semibold">
              <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-900/60 text-[10px]">{currentRole}</span>
              <span>Context API</span>
            </div>
          </div>
        </aside>

        {/* --- MAIN PAGE CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">

          {/* ----------------- TAB: EXECUTIVE ANALYTICS ----------------- */}
          {activeTab === 'dashboard' && !activeProposalId && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Revenue &amp; Pipeline</h2>
                  <p className="text-slate-500 mt-1">SaaS metrics mapping win outcomes and active RAG retrieval statistics.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                    Refreshed: Real-time (Active)
                  </span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Proposals</span>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{totalBids}</h3>
                    <p className="text-xs text-indigo-600 font-medium mt-1">Across all bid domains</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Briefcase className="w-6 h-6" /></div>
                </div>

                <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Win Rate</span>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{winRate}%</h3>
                    <p className="text-xs text-emerald-600 font-medium mt-1">Based on client scorecards</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
                </div>

                <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Bids</span>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{activeProposals}</h3>
                    <p className="text-xs text-amber-600 font-medium mt-1">Sections assigned to SMEs</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Clock className="w-6 h-6" /></div>
                </div>

                <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated pipeline Value</span>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">${totalValue.toLocaleString()}</h3>
                    <p className="text-xs text-slate-500 mt-1">Estimated contract volume</p>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-600"><DollarSign className="w-6 h-6" /></div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Win Probabilities */}
                <div className="glass-panel p-6 rounded-3xl shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <span>Win Probability Analysis (%)</span>
                  </h4>
                  <div className="h-64">
                    {proposals.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getProposalChartData()}>
                          <defs>
                            <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                          <XAxis dataKey="name" tick={{fontSize: 11, fill: chartTickColor}} stroke={chartStrokeColor} />
                          <YAxis domain={[0, 100]} tick={{fontSize: 11, fill: chartTickColor}} stroke={chartStrokeColor} />
                          <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0d1222' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#f1f5f9' : '#1e293b', borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="probability" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProb)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                        No active proposal records found to plot.
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart 2: Competitor Pricing & Capability limits */}
                <div className="glass-panel p-6 rounded-3xl shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-rose-600" />
                    <span>Competitor Capability Disruption</span>
                  </h4>
                  <div className="h-64 flex flex-col justify-between">
                    <div className="space-y-4">
                      {competitors.map(c => {
                        let limits = [];
                        try { 
                          limits = JSON.parse(c.insights?.[0]?.capability_limits || '[]'); 
                        } catch (err) { 
                          console.error(err); 
                        }
                        return (
                          <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">{c.market_segment}</span>
                            </div>
                            <div className="mt-2 text-xs text-rose-700 flex flex-wrap gap-1.5 items-center">
                              <span className="font-semibold">Core Limitations:</span>
                              {limits.map((l, i) => (
                                <span key={i} className="bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px]">
                                  {l}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500 italic">
                              <span className="font-semibold text-slate-600">Pricing Strategy: </span>{c.insights?.[0]?.pricing_strategy || 'No pricing records.'}
                            </div>
                          </div>
                        );
                      })}
                      {competitors.length === 0 && (
                        <div className="text-center text-slate-400 py-10 font-medium">No competitor records registered.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed of Agent Tasks & Activities */}
              <div className="glass-panel p-6 rounded-3xl shadow-sm">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span>Cognitive Agent Work logs</span>
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold">
                    ACTIVE POOL: {tasks.length} JOB(S)
                  </span>
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {tasks.map(t => (
                    <div key={t.id} className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/40 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{t.agent_type}</div>
                          <div className="text-xs text-slate-500 truncate max-w-lg">Payload: {t.payload}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(t.created_at).toLocaleTimeString()}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-slate-400 text-center py-6">No background agent jobs logged.</div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* ----------------- TAB: ORGANIZATIONAL MEMORY ----------------- */}
          {activeTab === 'memory' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Organizational Memory</h2>
                  <p className="text-slate-500 mt-1">Cross-tenant isolated cognitive database chunked and ready for Agentic RAG.</p>
                </div>
                <button
                  onClick={() => setShowAddNodeModal(true)}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Ingest Knowledge Node</span>
                </button>
              </div>

              {/* Memory distribution card info */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {getMemoryCategoryCounts().map((c, i) => (
                  <div key={i} className="bg-white/80 p-4 rounded-xl border border-slate-200/50 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{c.name}</span>
                    <span className="text-2xl font-extrabold block mt-1" style={{ color: c.color }}>{c.count}</span>
                  </div>
                ))}
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm max-w-xl">
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Query semantic memory (e.g. SOC 2, FedEx Mainframe, APIs)..."
                  className="bg-transparent w-full text-sm outline-none text-slate-800"
                />
              </div>

              {/* Knowledge Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {knowledgeNodes.map(node => {
                  let tags = [];
                  try {
                    const parsed = JSON.parse(node.metadata_json);
                    tags = parsed.tags || [];
                  } catch (err) {
                    console.error(err);
                  }
                  return (
                    <div key={node.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            node.category === 'COMPLIANCE' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                            node.category === 'CAPABILITY' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            node.category === 'CASE_STUDY' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            {node.category.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => handleDeleteKnowledgeNode(node.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1 rounded-lg hover:bg-slate-100"
                            title="Purge Knowledge Block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mt-4 leading-snug">{node.title}</h4>
                        <p className="text-slate-600 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{node.content}</p>
                      </div>

                      <div className="border-t border-slate-100 mt-5 pt-4 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((t, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          MD5: {node.hash?.substring(0, 10) || 'b4f2c8d2a1'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {knowledgeNodes.length === 0 && (
                  <div className="col-span-2 text-center py-20 text-slate-400 font-semibold bg-white rounded-3xl border border-dashed border-slate-300">
                    No organizational memory nodes exist. Ingest nodes to build RAG context.
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ----------------- TAB: RFP MANAGEMENT ----------------- */}
          {activeTab === 'rfp' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">RFP Ingestion Hub</h2>
                  <p className="text-slate-500 mt-1">Upload tenders to parse compliance matrix constraints and calculate win probabilities.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Form */}
                <div className="glass-panel p-6 rounded-3xl shadow-sm h-fit">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span>Upload Bid Tender</span>
                  </h3>
                  <form onSubmit={handleRfpUploadSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">RFP Title / Project</label>
                      <input 
                        type="text" 
                        placeholder="e.g. USPS National Telematics"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                        value={rfpUploadMeta.title}
                        onChange={e => setRfpUploadMeta({...rfpUploadMeta, title: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issuer / Client Organization</label>
                      <input 
                        type="text" 
                        placeholder="e.g. United States Postal Service"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                        value={rfpUploadMeta.issuer}
                        onChange={e => setRfpUploadMeta({...rfpUploadMeta, issuer: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Response Due Window (Days)</label>
                      <input 
                        type="number" 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                        value={rfpUploadMeta.due_days}
                        onChange={e => setRfpUploadMeta({...rfpUploadMeta, due_days: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">RFP File (PDF / DOCX)</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition duration-200 cursor-pointer relative bg-slate-50/50">
                        <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={e => {
                            if (e.target.files.length > 0) {
                              setRfpUploadFile(e.target.files[0]);
                              setRfpUploadMeta({...rfpUploadMeta, title: e.target.files[0].name.replace(/\.[^/.]+$/, "")});
                            }
                          }}
                        />
                        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-semibold text-indigo-600 block">
                          {rfpUploadFile ? rfpUploadFile.name : 'Select or drop RFP tender file'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">PDF, DOCX up to 25MB</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingRfp}
                      className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Brain className="w-4 h-4" />
                      {uploadingRfp ? 'Analyzing Inbound Bid...' : 'Parse and Analyze Bid'}
                    </button>
                  </form>

                  {/* Realtime Extraction Logs Console */}
                  {uploadingRfp && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-900 text-slate-400 font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto">
                      <div className="text-indigo-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>AGENT PIPELINE OUTPUT</span>
                      </div>
                      {uploadLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-slate-600">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RFP List Drawer */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Ingested Tender List</h3>
                  
                  {rfps.map(rfp => (
                    <div 
                      key={rfp.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-indigo-950 leading-tight">{rfp.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">{rfp.issuer}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due: {new Date(rfp.due_date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                              rfp.status === 'ANALYZED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {rfp.status}
                            </span>
                          </div>
                        </div>

                        {/* Win Prob Score Widget */}
                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Win Score</span>
                          <span className={`text-xl font-extrabold block mt-0.5 ${
                            (rfp.analyses?.[0]?.win_probability_score || 0.65) > 0.75 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {Math.round((rfp.analyses?.[0]?.win_probability_score || 0.65) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Summary details */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/40 text-xs space-y-2.5">
                        {rfp.analyses?.[0]?.critical_gaps && (
                          <div>
                            <span className="font-bold text-rose-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Critical Gap:</span>
                            <p className="text-slate-600 mt-1 pl-4 leading-relaxed">
                              {JSON.parse(rfp.analyses[0].critical_gaps)?.[0] || 'No gaps logged.'}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-indigo-950 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Compliance Strategy:</span>
                          <div className="grid grid-cols-1 gap-1.5 mt-1.5 pl-4">
                            {rfp.requirements?.slice(0, 3).map(r => (
                              <div key={r.id} className="flex justify-between items-start gap-3 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                <div>
                                  <span className="font-semibold text-slate-700 text-[10px]">{r.req_id}: </span>
                                  <span className="text-slate-500 leading-normal">{r.extracted_text}</span>
                                </div>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  r.risk_vector === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  r.risk_vector === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {r.risk_vector}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => {
                            const propObj = proposals.find(p => p.rfp_id === rfp.id);
                            if (propObj) {
                              handleSelectProposal(propObj.id);
                              setActiveTab('proposal');
                            } else {
                              triggerToast('Proposal workspace does not exist.', 'error');
                            }
                          }}
                          className="bg-indigo-55 text-indigo-700 border border-indigo-100 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Go to Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {rfps.length === 0 && (
                    <div className="text-slate-400 text-center py-20 bg-white rounded-3xl border border-slate-200">
                      No bid RFPs ingested yet. Upload an RFP above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* ----------------- TAB: PROPOSAL WORKSPACE (KANBAN & EDITOR) ----------------- */}
          {activeTab === 'proposal' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              
              {/* Kanban Pipeline (Shown if no active proposal is selected in editor) */}
              {!activeProposalId && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Active Bid Response Workspace</h2>
                    <p className="text-slate-500 mt-1">Review drafts, assign chapters to SMEs, verify compliance, and record client scorecards.</p>
                  </div>

                  {/* Kanban Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Drafting */}
                    <div className="bg-slate-100/75 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 h-[500px] overflow-y-auto">
                      <div className="flex justify-between items-center px-1 font-bold text-xs text-slate-500 uppercase tracking-wider">
                        <span>Drafting</span>
                        <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">{proposals.filter(p => p.status === 'DRAFT').length}</span>
                      </div>
                      
                      {proposals.filter(p => p.status === 'DRAFT').map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleSelectProposal(p.id)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow transition"
                        >
                          <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                          <div className="text-[10px] text-slate-400 mt-2 font-mono">ID: {p.id.substring(0, 8)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Column 2: Review & Approval */}
                    <div className="bg-slate-100/75 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 h-[500px] overflow-y-auto">
                      <div className="flex justify-between items-center px-1 font-bold text-xs text-slate-500 uppercase tracking-wider">
                        <span>Under Review</span>
                        <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">{proposals.filter(p => p.status === 'UNDER_REVIEW').length}</span>
                      </div>
                      
                      {proposals.filter(p => p.status === 'UNDER_REVIEW').map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleSelectProposal(p.id)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow transition"
                        >
                          <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                          <div className="text-[10px] text-slate-400 mt-2 font-mono">ID: {p.id.substring(0, 8)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Column 3: Submitted / Outcomes */}
                    <div className="bg-slate-100/75 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 h-[500px] overflow-y-auto">
                      <div className="flex justify-between items-center px-1 font-bold text-xs text-slate-500 uppercase tracking-wider">
                        <span>Submitted / Outcome</span>
                        <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">{proposals.filter(p => p.status === 'WON' || p.status === 'LOST').length}</span>
                      </div>
                      
                      {proposals.filter(p => p.status === 'WON' || p.status === 'LOST').map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleSelectProposal(p.id)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow transition relative"
                        >
                          <h4 className="font-bold text-slate-800 text-sm pr-12">{p.title}</h4>
                          <div className="text-[10px] text-slate-400 mt-2 font-mono">ID: {p.id.substring(0, 8)}</div>
                          <span className={`absolute top-4 right-4 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            p.status === 'WON' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* The Core Editor View (when activeProposal is set) */}
              {activeProposalId && activeProposal && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setActiveProposalId(null); setActiveProposal(null); }}
                        className="text-slate-400 hover:text-slate-800 text-sm font-semibold flex items-center gap-1"
                      >
                        &larr; Back to Bids
                      </button>
                      <span className="text-slate-300">|</span>
                      <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{activeProposal.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>File Win/Loss Scorecard</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Work Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Panel: Outline Tree */}
                    <div className="lg:col-span-1 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Sections</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
                        {activeProposal.sections?.map(sec => (
                          <div 
                            key={sec.id}
                            onClick={() => handleSelectSection(sec)}
                            className={`p-4 cursor-pointer text-left transition duration-150 ${
                              selectedSectionId === sec.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-bold text-slate-800 text-sm truncate">{sec.title}</div>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Assigned: {users.find(u => u.id === sec.assigned_to)?.first_name || 'Unassigned'}</span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                sec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                sec.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {sec.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Middle Panel: text editor */}
                    <div className="lg:col-span-2 space-y-4">
                      {selectedSectionId ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between min-h-[480px]">
                          <div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <h4 className="text-lg font-bold text-slate-900">
                                {activeProposal.sections.find(s => s.id === selectedSectionId)?.title}
                              </h4>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">Status:</span>
                                <button 
                                  onClick={() => handleUpdateSectionStatus('DRAFT')}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                                >
                                  DRAFT
                                </button>
                                <button 
                                  onClick={() => handleUpdateSectionStatus('UNDER_REVIEW')}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 cursor-pointer"
                                >
                                  REVIEW
                                </button>
                                <button 
                                  onClick={() => handleUpdateSectionStatus('APPROVED')}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 cursor-pointer"
                                >
                                  APPROVE
                                </button>
                              </div>
                            </div>

                            {/* RAG Context Grounding Banner */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/40 text-xs flex justify-between items-center gap-4 mt-4">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Database className="w-4 h-4 text-indigo-500" />
                                <span>Grounded on active organizational memory.</span>
                              </div>
                              <button
                                onClick={() => handleAiAssist('fill')}
                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Autofill from Memory</span>
                              </button>
                            </div>

                            {/* Text Area Editor */}
                            <textarea
                              className="w-full h-80 p-4 border border-slate-200 rounded-2xl mt-4 outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed font-sans"
                              value={sectionContent}
                              onChange={e => setSectionContent(e.target.value)}
                            />
                          </div>

                          {/* Editor Actions bar */}
                          <div className="border-t border-slate-100 pt-4 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAiAssist('improve')}
                                className="bg-purple-50 text-purple-700 border border-purple-100 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-100 flex items-center gap-1 transition cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Improve Tone</span>
                              </button>
                              <button
                                onClick={() => handleAiAssist('qa')}
                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 transition cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                <span>AI QA Check</span>
                              </button>
                            </div>
                            <button
                              onClick={handleSaveSection}
                              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow transition cursor-pointer"
                            >
                              Save Draft
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 py-40">
                          Select a proposal section from the outline tree to start editing.
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Workflow Actions, SME assigns, approvals */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="glass-panel p-5 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">SME Assignment</h4>
                        
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Domain Expert</label>
                          <select
                            value={activeProposal.sections.find(s => s.id === selectedSectionId)?.assigned_to || ''}
                            onChange={e => handleAssignSme(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            disabled={!selectedSectionId}
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.first_name} ({u.role_level})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* SME Sign-off Console */}
                      <div className="glass-panel p-5 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">SME Review Controls</h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Subject Matter Experts review and sign-off on domain accuracy before final bid compile.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => handleSectionReviewSubmit('REJECTED')}
                            className="bg-rose-50 text-rose-700 border border-rose-100 p-2.5 rounded-xl text-xs font-bold hover:bg-rose-100 flex items-center justify-center gap-1 transition cursor-pointer"
                            disabled={!selectedSectionId}
                          >
                            <X className="w-4 h-4" />
                            <span>Request Edit</span>
                          </button>
                          <button
                            onClick={() => handleSectionReviewSubmit('APPROVED')}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1 transition cursor-pointer"
                            disabled={!selectedSectionId}
                          >
                            <Check className="w-4 h-4" />
                            <span>Sign-off</span>
                          </button>
                        </div>
                      </div>

                      {/* Review History */}
                      <div className="glass-panel p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Review Audit Trail</h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                          {activeProposal.sections?.find(s => s.id === selectedSectionId)?.reviews?.map(rev => (
                            <div key={rev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">{users.find(u => u.id === rev.reviewer_id)?.first_name || 'SME'}</span>
                                <span className={`font-bold uppercase ${rev.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>{rev.status}</span>
                              </div>
                              <p className="text-slate-500 mt-1 italic">"{rev.comments}"</p>
                            </div>
                          ))}
                          {(!selectedSectionId || activeProposal.sections?.find(s => s.id === selectedSectionId)?.reviews?.length === 0) && (
                            <div className="text-slate-400 text-center text-xs py-4">No reviews submitted.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ----------------- TAB: COMPETITOR INTELLIGENCE ----------------- */}
          {activeTab === 'competitors' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Competitor Intelligence</h2>
                  <p className="text-slate-500 mt-1">Ethical pattern mining, pricing models, and capability limits analyzed from public registries.</p>
                </div>
                <button
                  onClick={() => setShowAddCompetitor(true)}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>File Competitor Report</span>
                </button>
              </div>

              {/* Grid of Competitors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {competitors.map(comp => {
                  let limits = [];
                  try {
                    limits = JSON.parse(comp.insights?.[0]?.capability_limits || '[]');
                  } catch (err) {
                    console.error(err);
                  }
                  return (
                    <div key={comp.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xl font-extrabold text-slate-900">{comp.name}</h4>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold inline-block mt-1">
                              {comp.market_segment}
                            </span>
                          </div>
                          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl"><Shield className="w-5 h-5" /></div>
                        </div>

                        {/* Limits List */}
                        <div className="mt-5 space-y-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ethically Extracted Gaps</span>
                          <div className="space-y-1.5">
                            {limits.map((lim) => (
                              <div key={lim} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{lim}</span>
                              </div>
                            ))}
                            {limits.length === 0 && <span className="text-xs text-slate-400">No limitations documented.</span>}
                          </div>
                        </div>

                        {/* Pricing model */}
                        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Pricing Strategy</span>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            {comp.insights?.[0]?.pricing_strategy || 'No pricing strategy filed.'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-2 flex justify-between">
                        <span>Database Isolated</span>
                        <span>Record updated: {new Date(comp.insights?.[0]?.extracted_date || '2026-06-07T12:00:00Z').toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}

                {competitors.length === 0 && (
                  <div className="col-span-2 text-center py-20 text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                    No competitor intelligence reports filed.
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ----------------- TAB: AI AGENT CONSOLE ----------------- */}
          {activeTab === 'tasks' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Agent Management Console</h2>
                  <p className="text-slate-500 mt-1">Manual execution triggers and log records of background worker cognitive processes.</p>
                </div>
              </div>

              {/* Trigger widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Company Intelligence Agent</h4>
                    <p className="text-xs text-slate-500 mt-1">Headless web scraping to build corporate footprints from domain registers.</p>
                  </div>
                  <button 
                    onClick={() => triggerManualAgentTask('RFP_ANALYZER')}
                    className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Run Crawler Scraper
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Proposal Strategist Writer</h4>
                    <p className="text-xs text-slate-500 mt-1">Generates multi-section draft blueprints using Agentic RAG models.</p>
                  </div>
                  <button 
                    onClick={() => triggerManualAgentTask('PROPOSAL_WRITER')}
                    className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Run Outline Drafter
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Quality Assurance Compliance Agent</h4>
                    <p className="text-xs text-slate-500 mt-1">Audits proposal text drafts against raw RFP compliance constraints.</p>
                  </div>
                  <button 
                    onClick={() => triggerManualAgentTask('COMPLIANCE_QA')}
                    className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Verify Compliance
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Reinforcement Learning Agent</h4>
                    <p className="text-xs text-slate-500 mt-1">Re-weights vector embeddings and updates semantic memories based on win/loss outcome.</p>
                  </div>
                  <button 
                    onClick={() => triggerManualAgentTask('LEARNING_AGENT')}
                    className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Trigger Weight Adjust
                  </button>
                </div>
              </div>

              {/* In-Depth Logs Console */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-indigo-400 font-mono flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>SYSTEM BACKGROUND WORKER LOG STREAM</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Total logged runs: {tasks.length}</span>
                </div>

                <div className="space-y-4 font-mono text-xs max-h-[400px] overflow-y-auto text-slate-300 pr-2">
                  {tasks.map(t => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-800/60 pb-1.5">
                        <span className="text-purple-400 font-bold">{t.agent_type}</span>
                        <span className="text-slate-500">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <div><span className="text-slate-500">Task UUID:</span> <span className="text-slate-400">{t.id}</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className="text-emerald-500 font-bold">{t.status}</span></div>
                        <div><span className="text-slate-500">Payload:</span> <span className="text-slate-400 break-all">{t.payload}</span></div>
                        {t.result && (
                          <div className="mt-1 bg-slate-950/80 p-2.5 rounded border border-slate-800/40">
                            <span className="text-indigo-400 font-bold block text-[10px] uppercase mb-1">Execution Result:</span>
                            <span className="text-slate-300">{t.result}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center text-slate-600 py-10 font-mono">Log console empty. No agent task records.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- ADD KNOWLEDGE NODE MODAL --- */}
      {showAddNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Ingest Knowledge Asset</h3>
              <button onClick={() => setShowAddNodeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateKnowledgeNode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Category</label>
                <select
                  value={newNode.category}
                  onChange={e => setNewNode({...newNode, category: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="COMPANY_PROFILE">Company Profile</option>
                  <option value="CAPABILITY">Capability</option>
                  <option value="CASE_STUDY">Case Study</option>
                  <option value="TEAM_EXPERTISE">Team Expertise</option>
                  <option value="COMPLIANCE">Compliance Certification</option>
                  <option value="PRICING_FRAMEWORK">Pricing Framework</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Node Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. AWS Security Baseline"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newNode.title}
                  onChange={e => setNewNode({...newNode, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Corporate Text / Fact Block</label>
                <textarea 
                  placeholder="Paste details of internal files, capabilities, past cases..."
                  className="w-full h-32 p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newNode.content}
                  onChange={e => setNewNode({...newNode, content: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. cloud, encryption, aws"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newNode.tags}
                  onChange={e => setNewNode({...newNode, tags: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowAddNodeModal(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-600/20 cursor-pointer">Ingest Block</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TENANT COMPANY MODAL --- */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Register Tenant Company</h3>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Acme Logistics"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompany.name}
                  onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Domain Boundary</label>
                <input 
                  type="text" 
                  placeholder="e.g. acmelogistics.com"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompany.domain}
                  onChange={e => setNewCompany({...newCompany, domain: e.target.value})}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isStartup"
                  checked={newCompany.is_startup}
                  onChange={e => setNewCompany({...newCompany, is_startup: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="isStartup" className="text-sm font-semibold text-slate-700 cursor-pointer">Apply Startup Capability Framework</label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowAddCompanyModal(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-600/20 cursor-pointer">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TENANT USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add User to Tenant</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. expert@domain.com"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newUser.password || ''}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John"
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                    value={newUser.first_name}
                    onChange={e => setNewUser({...newUser, first_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Doe"
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                    value={newUser.last_name}
                    onChange={e => setNewUser({...newUser, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">RBAC Role Level</label>
                <select
                  value={newUser.role_level}
                  onChange={e => setNewUser({...newUser, role_level: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="SUPER_ADMIN">Global Super Admin</option>
                  <option value="ENTERPRISE_ADMIN">Enterprise Admin</option>
                  <option value="PROPOSAL_MANAGER">Proposal Manager</option>
                  <option value="SME">Subject Matter Expert (SME)</option>
                  <option value="EXTERNAL_CONSULTANT">External Consultant</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-600/20 cursor-pointer">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD COMPETITOR MODAL --- */}
      {showAddCompetitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">File Competitor Intelligence Report</h3>
              <button onClick={() => setShowAddCompetitor(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCompetitor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Competitor Legal Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Giganto Logistics Corp"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompetitor.name}
                  onChange={e => setNewCompetitor({...newCompetitor, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Market Segment</label>
                <input 
                  type="text" 
                  placeholder="e.g. Heavy Freight Telemetry"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompetitor.market_segment}
                  onChange={e => setNewCompetitor({...newCompetitor, market_segment: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capability Gaps (Comma Separated)</label>
                <textarea 
                  placeholder="e.g. Lacks encryption at rest, requires manual XML loading, no webhooks"
                  className="w-full h-20 p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompetitor.capability_limits}
                  onChange={e => setNewCompetitor({...newCompetitor, capability_limits: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estimated Pricing Model Strategy</label>
                <input 
                  type="text" 
                  placeholder="e.g. Underbids initial service, charges heavy overages later"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newCompetitor.pricing_strategy}
                  onChange={e => setNewCompetitor({...newCompetitor, pricing_strategy: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowAddCompetitor(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-600/20 cursor-pointer">Submit Intel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SUBMIT FEEDBACK SCORECARD MODAL --- */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Bid Post-Mortem Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bid Outcome</label>
                <select
                  value={feedbackForm.win_loss_outcome ? "win" : "loss"}
                  onChange={e => setFeedbackForm({...feedbackForm, win_loss_outcome: e.target.value === "win"})}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
                >
                  <option value="win" className="text-emerald-600 font-bold">WON - Awarded Contract</option>
                  <option value="loss" className="text-rose-600 font-bold font-semibold">LOST - Rejected / Not Awarded</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Client Evaluator Rating (0.0 - 10.0)</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="10"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={feedbackForm.evaluator_score}
                  onChange={e => setFeedbackForm({...feedbackForm, evaluator_score: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scorecard / Evaluator Comments</label>
                <textarea 
                  placeholder="Paste feedback received from client or procurement committee..."
                  className="w-full h-24 p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  value={feedbackForm.evaluator_comments}
                  onChange={e => setFeedbackForm({...feedbackForm, evaluator_comments: e.target.value})}
                  required
                />
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 leading-normal">
                <strong>AI Learning Note:</strong> Filing a scorecard triggers the Reinforcement Learning Agent to run backpropagation, re-weighting search vectors of mapped capabilities based on win outcomes.
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-600/20 cursor-pointer">Submit Outcome</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
