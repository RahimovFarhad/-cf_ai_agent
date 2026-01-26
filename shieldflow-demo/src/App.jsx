import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Lock, BarChart3, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const API_BASE = 'https://restless-morning-edcc.farhad-r2006.workers.dev';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'demo'
  const [apiKey, setApiKey] = useState(null);
  const [customerId, setCustomerId] = useState('');
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
      <div className="relative bg-slate-900 text-white h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
        
        <nav className="relative z-10 container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Shield className="w-8 h-8 text-blue-400" />
              ShieldFlow
            </div>
            <button
              onClick={onStartDemo}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-500 transition-all"
            >
              Try Demo
            </button>
          </div>
        </nav>

        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 bg-blue-600/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-blue-500/20">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-200">Powered by Cloudflare Workers AI</span>
            </div>
            
            <h1 className="text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              Real-time AI Content<br />Moderation
            </h1>
            
            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Protect your platform with instant, intelligent content filtering. Built on Cloudflare's edge network for blazing-fast moderation at scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onStartDemo}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                Launch Live Demo
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-transparent border-2 border-slate-600 px-8 py-4 rounded-lg font-semibold hover:bg-slate-800 hover:border-slate-500 transition-all"
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three simple steps to protect your platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">1. Integrate API</h3>
              <p className="text-slate-600 leading-relaxed">
                Add ShieldFlow to your platform with a simple API call. Each content submission is instantly analyzed.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-600/20">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">2. AI Analysis</h3>
              <p className="text-slate-600 leading-relaxed">
                Our Llama 3.1 model analyzes toxicity, hate speech, and harassment in milliseconds.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">3. Get Results</h3>
              <p className="text-slate-600 leading-relaxed">
                Receive instant decisions with toxicity scores to inform your moderation workflow.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onStartDemo}
              className="bg-slate-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg"
            >
              See It In Action →
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">Built on Cloudflare's Edge</h2>
            <p className="text-xl text-slate-600">
              Enterprise-grade serverless infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🤖</div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">Workers AI</h3>
              <p className="text-slate-600 text-sm">Llama inference at the edge</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-cyan-50 p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔄</div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">Durable Objects</h3>
              <p className="text-slate-600 text-sm">Stateful per-customer isolation</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚡</div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">Websockets</h3>
              <p className="text-slate-600 text-sm">Live dashboard updates and Chat with AI</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-cyan-50 p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-cyan-300 transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🗄️</div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">Memory Persistence</h3>
              <p className="text-slate-600 text-sm">Persistent memory for customer sessions</p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🌐</div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">Cloudflare Pages</h3>
              <p className="text-slate-600 text-sm">Static site hosting for the frontend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xl font-bold mb-3">
            <Shield className="w-6 h-6 text-blue-400" />
            ShieldFlow
          </div>
          <p className="text-slate-400">
            Built for Cloudflare Internship Application • Demo Project
          </p>
        </div>
      </footer>
    </div>
  );
}

function SetupPage({ customerId, setCustomerId, isGenerating, onGenerate }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
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
  const [moderationModal, setModerationModal] = useState(null);


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
        if (state.aiContext?.length) {
          setChatMessages(state.aiContext);
        }
        if (state.moderationLogs?.length) {
          setLogs(state.moderationLogs.slice(0, 20));
        }
      })
      .catch(err => console.error('Failed to load state:', err));

    // Connect WebSocket
    const wsUrl =
      `wss://restless-morning-edcc.farhad-r2006.workers.dev/ws?apiKey=${encodeURIComponent(apiKey)}`;
    const socket = new WebSocket(wsUrl);


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

    const postData = { title, content, author };
    
    // Show checking modal
    setModerationModal({ status: 'checking', title, content });
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
          text: `Title: ${postData.title}. Content: ${postData.content}`,
          userId: postData.author,
          metadata: { postId: 'post-' + Date.now() }
        })
      });

      const result = await response.json();
      
      // Show result modal
      setModerationModal({ 
        status: 'result', 
        decision: result.decision,
        score: result.score,
        reasons: result.reasons,
        title: postData.title,
        content: postData.content
      });

      // Add to posts if approved or flagged
      if (result.decision === 'approved' || result.decision === 'flagged') {
        const post = {
          id: 'post-' + Date.now(),
          author: postData.author,
          title: postData.title,
          content: postData.content,
          timestamp: Date.now(),
          status: result.decision,
          requestId: result.requestId,
          score: result.score
        };
        setPosts(prev => [post, ...prev]);
      }
    } catch (error) {
      console.error('Moderation failed:', error);
      setModerationModal({ status: 'error', error: error.message });
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
      <header className="bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 text-white px-6 py-4 shadow-lg">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Write a New Post</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Quick Test Below ↓</span>
                </div>
                
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

                  {/* Quick Test Buttons */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Quick Test Examples:</span>
                      <span className="text-xs text-gray-400">(Click to auto-fill)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setTitle("Amazing Product Review");
                          setContent("I absolutely love this new feature! It's made my workflow so much easier and the team has been incredibly helpful. Highly recommended to everyone!");
                        }}
                        className="bg-green-50 border border-green-300 text-green-800 px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-100 transition text-left"
                      >
                        ✅ <strong>Positive</strong>
                        <div className="text-green-600 text-xs mt-0.5">Safe content</div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setTitle("My Thoughts on the Update");
                          setContent("The new update has some interesting changes. I think there are both pros and cons. The interface looks cleaner but I'm still getting used to the new layout.");
                        }}
                        className="bg-blue-50 border border-blue-300 text-blue-800 px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-100 transition text-left"
                      >
                        ℹ️ <strong>Neutral</strong>
                        <div className="text-blue-600 text-xs mt-0.5">Normal discussion</div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setTitle("Frustrated with Service");
                          setContent("This is getting ridiculous. You idiots can't seem to do anything right. Every update breaks something and your support is utterly useless. What a joke!");
                        }}
                        className="bg-orange-50 border border-orange-300 text-orange-800 px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-100 transition text-left"
                      >
                        ⚠️ <strong>Toxic</strong>
                        <div className="text-orange-600 text-xs mt-0.5">Hostile language</div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setTitle("You People Make Me Sick");
                          setContent("I hate all of you. You're all worthless scum and deserve to suffer. I hope terrible things happen to everyone on your pathetic team. You disgust me.");
                        }}
                        className="bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-100 transition text-left"
                      >
                        🚫 <strong>Aggressive</strong>
                        <div className="text-red-600 text-xs mt-0.5">Severe violation</div>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      💡 These are test examples to demonstrate ShieldFlow's moderation capabilities
                    </p>
                  </div>
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
              
      {/* Moderation Modal */}
      {moderationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            {moderationModal.status === 'checking' && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Shield className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Checking Your Content</h3>
                  <p className="text-gray-600 mb-6">ShieldFlow is analyzing your post for safety...</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </>
            )}
            
            {moderationModal.status === 'result' && (
              <>
                {moderationModal.decision === 'approved' && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">✅ Post Approved!</h3>
                    <p className="text-gray-600 mb-4">Your content passed moderation and is now live.</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
                      <div className="text-sm text-green-800">
                        <strong>Toxicity Score:</strong> {moderationModal.score.toFixed(3)}
                      </div>
                    </div>
                    <button
                      onClick={() => setModerationModal(null)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      Great!
                    </button>
                  </div>
                )}
                
                {moderationModal.decision === 'flagged' && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">⚠️ Post Flagged</h3>
                    <p className="text-gray-600 mb-4">Your post has been published but flagged for review.</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                      <div className="text-sm text-yellow-800 mb-2">
                        <strong>Toxicity Score:</strong> {moderationModal.score.toFixed(3)}
                      </div>
                      <div className="text-sm text-yellow-800">
                        <strong>Reasons:</strong> {moderationModal.reasons.join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => setModerationModal(null)}
                      className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition"
                    >
                      I Understand
                    </button>
                  </div>
                )}
                
                {moderationModal.decision === 'rejected' && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">❌ Post Rejected</h3>
                    <p className="text-gray-600 mb-4">Your content violates our community guidelines and cannot be published.</p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                      <div className="text-sm text-red-800 mb-2">
                        <strong>Toxicity Score:</strong> {moderationModal.score.toFixed(3)}
                      </div>
                      <div className="text-sm text-red-800">
                        <strong>Violations:</strong> {moderationModal.reasons.join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => setModerationModal(null)}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Close
                    </button>
                  </div>
                )}
              </>
            )}
            
            {moderationModal.status === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600 mb-6">{moderationModal.error}</p>
                <button
                  onClick={() => setModerationModal(null)}
                  className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}

function BlogPost({ post }) {
  const statusConfig = {
    moderating: { icon: '🔍', color: 'border-purple-400 bg-purple-50', badge: 'bg-purple-100 text-purple-800 animate-pulse' },
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
        {config.icon} {post.status === 'moderating' ? 'Checking...' : post.status}
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