import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Lock, BarChart3, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const API_BASE = 'https://restless-morning-edcc.farhad-r2006.workers.dev';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'demo'
  const [apiKey, setApiKey] = useState(null);
  const [customerId, setCustomerId] = useState('demo-customer');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'landing' ? (
        <LandingPage 
          onStartDemo={() => setCurrentView('setup')}
        />
      ) : currentView === 'setup' ? (
        <SetupPage
          customerId={customerId}
          setCustomerId={setCustomerId}
          isGenerating={isGenerating}
          onGenerate={async () => {
            setIsGenerating(true);
            try {
              const response = await fetch(`${API_BASE}/demo/generate-apiKey`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'Demo-Customer-Id': customerId })
              });
              const data = await response.json();
              if (response.ok) {
                setApiKey(data.demoKey);
                setTimeout(() => setCurrentView('demo'), 1500);
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Failed to generate API key: ' + error.message);
            } finally {
              setIsGenerating(false);
            }
          }}
        />
      ) : (
        <DemoPage apiKey={apiKey} customerId={customerId} onBack={() => setCurrentView('landing')} />
      )}
    </div>
  );
}

function LandingPage({ onStartDemo }) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Shield className="w-8 h-8" />
              ShieldFlow
            </div>
            <button
              onClick={onStartDemo}
              className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Try Demo
            </button>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/20">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Powered by Cloudflare Workers AI</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Real-time AI Content Moderation
            </h1>
            
            <p className="text-xl lg:text-2xl mb-10 text-indigo-100 max-w-3xl mx-auto">
              Protect your platform with instant, intelligent content filtering. Built on Cloudflare's edge network for blazing-fast moderation at scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onStartDemo}
                className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Launch Live Demo
              </button>
              <a
                href="#how-it-works"
                className="bg-transparent border-2 border-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition"
              >
                How It Works
              </a>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-4xl font-bold mb-2">99.9%</div>
                <div className="text-indigo-200 text-sm">Accuracy Rate</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">&lt;100ms</div>
                <div className="text-indigo-200 text-sm">Response Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-indigo-200 text-sm">Edge Coverage</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How ShieldFlow Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A Cloudflare-native solution for real-time content moderation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-2xl border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Integrate Our API</h3>
              <p className="text-gray-600">
                Add ShieldFlow to your platform with a simple API call. Each content submission is instantly analyzed before reaching your users.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. AI Analysis</h3>
              <p className="text-gray-600">
                Our Llama 3.1 model running on Workers AI analyzes toxicity, hate speech, harassment, and other violations in milliseconds.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-red-50 p-8 rounded-2xl border border-pink-100">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Get Results</h3>
              <p className="text-gray-600">
                Receive instant decisions (approved/flagged/rejected) with confidence scores and reasoning to inform your moderation workflow.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onStartDemo}
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg"
            >
              See It In Action →
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Built on Cloudflare's Edge</h2>
            <p className="text-xl text-gray-600">
              Leveraging cutting-edge serverless technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon="🤖"
              title="Workers AI"
              description="Llama 3.1 inference at the edge"
            />
            <FeatureCard
              icon="🔄"
              title="Durable Objects"
              description="Stateful per-customer isolation"
            />
            <FeatureCard
              icon="⚡"
              title="Real-time WebSockets"
              description="Live dashboard updates"
            />
            <FeatureCard
              icon="🗄️"
              title="KV Storage"
              description="API key management"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xl font-bold mb-2">
            <Shield className="w-6 h-6" />
            ShieldFlow
          </div>
          <p className="text-gray-400 text-sm">
            Built for Cloudflare Internship Application • Demo Project
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function SetupPage({ customerId, setCustomerId, isGenerating, onGenerate }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ShieldFlow Demo</h1>
          <p className="text-gray-600">Generate your API key to start testing</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer ID (Demo)
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="e.g., acme-corp"
            />
            <p className="mt-2 text-xs text-gray-500">
              In production, this would be your company identifier
            </p>
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating || !customerId.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isGenerating ? 'Generating...' : 'Generate API Key & Enter Demo'}
          </button>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              <strong>Note:</strong> This demo simulates how platforms integrate ShieldFlow. 
              Normally, only the admin dashboard would be on our domain - your blog would be on your own site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoPage({ apiKey, customerId, onBack }) {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ totalRequests: 0, approved: 0, rejected: 0, flagged: 0 });
  const [logs, setLogs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  // Form state
  const [author, setAuthor] = useState('Demo User');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chatInput, setChatInput] = useState('');

  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (!apiKey) return;

    // Load initial state
    fetch(`${API_BASE}/state`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
      .then(res => res.json())
      .then(state => {
        setStats(state.stats);
        if (state.moderationLogs?.length) {
          setLogs(state.moderationLogs.slice(0, 20));
        }
      })
      .catch(err => console.error('Failed to load state:', err));

    // Connect WebSocket
    const wsUrl = `wss://restless-morning-edcc.farhad-r2006.workers.dev/ws`;
    const socket = new WebSocket(wsUrl, [`bearer.${apiKey}`]);

    socket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'stats') {
        setStats(message.data);
      } else if (message.type === 'logs') {
        setLogs(message.data.slice(0, 20));
      } else if (message.type === 'moderation_result') {
        setLogs(prev => [message.data, ...prev.slice(0, 19)]);
        setPosts(prev => prev.map(p => 
          p.requestId === message.data.requestId 
            ? { ...p, status: message.data.decision, score: message.data.score }
            : p
        ));
      } else if (message.type === 'assistant') {
        setChatMessages(prev => [...prev, { role: 'assistant', text: message.text }]);
      } else if (message.type === 'query_status') {
        setChatMessages(prev => [...prev, { role: 'query_status', text: message.text }]);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    setWs(socket);

    return () => {
      if (socket) socket.close();
    };
  }, [apiKey]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const publishPost = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    const post = {
      id: 'post-' + Date.now(),
      author,
      title,
      content,
      timestamp: Date.now(),
      status: 'pending',
      requestId: null,
      score: null
    };

    setPosts(prev => [post, ...prev]);
    setTitle('');
    setContent('');

    try {
      const response = await fetch(`${API_BASE}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text: `Title: ${title}. Content: ${content}`,
          userId: author,
          metadata: { postId: post.id }
        })
      });

      const result = await response.json();
      post.requestId = result.requestId;
      post.status = result.decision;
      post.score = result.score;
      
      setPosts(prev => prev.map(p => p.id === post.id ? post : p));
    } catch (error) {
      console.error('Moderation failed:', error);
      post.status = 'error';
      setPosts(prev => prev.map(p => p.id === post.id ? post : p));
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ text: chatInput }));
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
  };

  return (
    <div className="h-screen flex flex-col min-h-0">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold">ShieldFlow Demo</h1>
              <p className="text-xs text-indigo-200">Customer: {customerId}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            <button
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Exit Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Mock Blog Platform */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 px-8 py-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">📝 Community Blog Platform</h2>
              <p className="text-gray-600">This simulates YOUR platform. All posts are protected by ShieldFlow.</p>
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Composer */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Write a New Post</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Post Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a catchy title..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={publishPost}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                  >
                    📤 Publish Post
                  </button>
                </div>
              </div>

              {/* Posts */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Recent Posts</h3>
                
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No posts yet. Write the first one! 🎉
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map(post => (
                      <BlogPost key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Admin Panel */}
        <div className="w-full lg:w-[500px] bg-gray-900 text-white flex flex-col border-l border-gray-700">
          {/* Stats */}
          <div className="bg-gray-800 border-b border-gray-700 p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Moderation Dashboard
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total" value={stats.totalRequests} />
              <StatBox label="Approved" value={stats.approved} color="text-green-400" />
              <StatBox label="Rejected" value={stats.rejected} color="text-red-400" />
              <StatBox label="Flagged" value={stats.flagged} color="text-yellow-400" />
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Activity Feed
            </h3>
            
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                Waiting for moderation requests...
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <LogEntry key={i} log={log} />
                ))}
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="bg-gray-800 border-t border-gray-700 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat with AI Agent
            </h3>
            
            <div
              ref={chatMessagesRef}
              className="bg-black/20 rounded-lg p-4 h-48 overflow-y-auto mb-4 space-y-2"
            >
              {chatMessages.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  Ask about stats, trends, or recent activity!
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask about moderation stats..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={sendChat}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogPost({ post }) {
  const statusConfig = {
    pending: { icon: '⏳', color: 'border-blue-400 bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
    approved: { icon: '✅', color: 'border-green-400 bg-green-50', badge: 'bg-green-100 text-green-800' },
    rejected: { icon: '❌', color: 'border-red-400 bg-red-50', badge: 'bg-red-100 text-red-800' },
    flagged: { icon: '⚠️', color: 'border-yellow-400 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800' },
    error: { icon: '🔴', color: 'border-gray-400 bg-gray-50', badge: 'bg-gray-100 text-gray-800' }
  };

  const config = statusConfig[post.status] || statusConfig.pending;

  return (
    <div className={`border-l-4 ${config.color} rounded-lg p-6 shadow-sm relative`}>
      <span className={`absolute top-4 right-4 ${config.badge} px-3 py-1 rounded-full text-xs font-bold uppercase`}>
        {config.icon} {post.status}
      </span>
      
      <div className="mb-3 flex items-center justify-between pr-24">
        <span className="font-semibold text-indigo-600">@{post.author}</span>
        <span className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleTimeString()}</span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
      <p className="text-gray-700 leading-relaxed">{post.content}</p>
      
      {post.score !== null && (
        <div className="mt-3 text-xs text-gray-500">
          Toxicity Score: {post.score.toFixed(3)}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 uppercase mt-1">{label}</div>
    </div>
  );
}

function LogEntry({ log }) {
  const decisionColors = {
    approved: 'border-green-500 text-green-400',
    rejected: 'border-red-500 text-red-400',
    flagged: 'border-yellow-500 text-yellow-400'
  };

  const color = decisionColors[log.decision] || 'border-gray-500 text-gray-400';

  return (
    <div className={`bg-white/5 border-l-2 ${color} rounded p-3 text-sm`}>
      <div className="flex justify-between mb-1">
        <span className={`font-bold uppercase text-xs ${color.split(' ')[1]}`}>{log.decision}</span>
        <span className="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="text-gray-400 text-xs">
        Score: {log.score.toFixed(3)} | {log.reasons.join(', ')}
        {log.userId && <><br/>User: {log.userId}</>}
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  return (
    <div className={`text-sm p-2 rounded ${message.role === 'user' ? 'bg-indigo-600 ml-8' : (message.role === 'query_status' ? 'text-gray-500' :'bg-white/10 mr-8')}`}>
      {message.text}
    </div>
  );
}

export default App;