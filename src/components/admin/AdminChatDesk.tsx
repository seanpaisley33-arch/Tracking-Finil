'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Image, Paperclip, Mic, Square, 
  Play, Pause, FileText, Download, User, Package, RefreshCw, 
  Check, CheckCheck, Pencil, Trash2, Bell, X, Sparkles, CheckSquare, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { formatRelativeTime } from '@/lib/formatTime';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminChatDesk() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [shipmentsList, setShipmentsList] = useState<{ tracking_number: string; receiver_name?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTracking, setActiveTracking] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<{ msg: ChatMessage; tracking: string } | null>(null);

  // Edit Message State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Audio Recording State for Admin
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Player State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log('Audio notification error:', e);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to unified live desk broadcast channel and DB changes
    const channel = supabase.channel('global_live_chat');
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          handleIncomingMessage(newMsg);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .on(
        'broadcast',
        { event: 'chat_message' },
        (payload) => {
          const newMsg = payload.payload as ChatMessage;
          handleIncomingMessage(newMsg);
        }
      )
      .on(
        'broadcast',
        { event: 'chat_edit' },
        (payload) => {
          const { id, content } = payload.payload;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content, is_edited: true } : m))
          );
        }
      )
      .on(
        'broadcast',
        { event: 'chat_delete' },
        (payload) => {
          const { id } = payload.payload;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .on(
        'broadcast',
        { event: 'chat_read' },
        (payload) => {
          const { tracking_number } = payload.payload || {};
          setMessages((prev) =>
            prev.map((m) =>
              (!tracking_number || m.tracking_number === tracking_number || (!m.tracking_number && tracking_number === 'General Queries'))
                ? { ...m, status: 'read' }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const handleIncomingMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    if (newMsg.sender_type === 'user') {
      playNotificationSound();
      const msgTn = newMsg.tracking_number || 'General Queries';
      if (msgTn !== activeTracking) {
        setUnreadCount((prev) => prev + 1);
        setActiveToast({ msg: newMsg, tracking: msgTn });
        setTimeout(() => setActiveToast(null), 6000);
      } else {
        scrollToBottom(false);
      }
    } else {
      scrollToBottom(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // 1. Fetch shipments from database
      const { data: shipData } = await supabase
        .from('shipments')
        .select('tracking_number, receiver_name')
        .order('created_at', { ascending: false });

      if (shipData) {
        setShipmentsList(shipData);
      }

      // 2. Fetch chat messages from database
      const { data: msgData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && msgData) {
        setMessages(msgData);
        if (!activeTracking) {
          if (msgData.length > 0) {
            selectConversation(msgData[msgData.length - 1].tracking_number || 'General Queries');
          } else if (shipData && shipData.length > 0) {
            selectConversation(shipData[0].tracking_number);
          }
        }
      }
    } catch (err) {
      console.error('fetchMessages catch:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (tn: string) => {
    setActiveTracking(tn);
    markAsRead(tn);
    scrollToBottom(true);
  };

  const markAsRead = async (tn: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.tracking_number === tn || (!m.tracking_number && tn === 'General Queries') ? { ...m, status: 'read' } : m))
    );

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_read',
        payload: { tracking_number: tn },
      });
    }
  };

  const scrollToBottom = (force = false) => {
    setTimeout(() => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (force || isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Merge created shipments and active chat messages into unified conversations list
  const allTrackingNumbers = Array.from(
    new Set([
      'General Queries',
      ...shipmentsList.map((s) => s.tracking_number),
      ...(messages.map((m) => m.tracking_number).filter(Boolean) as string[]),
    ])
  );

  const filteredConversations = allTrackingNumbers.filter((tn) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const ship = shipmentsList.find((s) => s.tracking_number === tn);
    return (
      tn.toLowerCase().includes(query) ||
      (ship?.receiver_name && ship.receiver_name.toLowerCase().includes(query))
    );
  });

  const trackingConversations = filteredConversations;

  const activeMessages = messages.filter((m) =>
    activeTracking === 'General Queries' ? !m.tracking_number : m.tracking_number === activeTracking
  );

  const sendAdminMessage = async (msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    scrollToBottom(true);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: msg,
      });
    }

    const payload: any = {
      id: msg.id && msg.id.includes('-') && msg.id.length === 36 ? msg.id : crypto.randomUUID(),
      tracking_number: activeTracking !== 'General Queries' ? activeTracking : null,
      sender_type: 'admin',
      sender_name: 'GlobalTrack Admin',
      message_type: msg.message_type,
      content: msg.content || null,
      file_url: msg.file_url || null,
      file_name: msg.file_name || null,
      file_size: msg.file_size || null,
      voice_duration: msg.voice_duration || null,
    };

    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) {
      console.error('Failed to insert admin message into database:', error.message);
    } else {
      if (msg.status || msg.is_edited) {
        try {
          await supabase
            .from('chat_messages')
            .update({ status: msg.status || 'delivered', is_edited: msg.is_edited || false })
            .eq('id', payload.id);
        } catch (e) {}
      }
    }
  };

  const handleSendText = () => {
    if (!replyText.trim()) return;
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      tracking_number: activeTracking !== 'General Queries' ? activeTracking : null,
      sender_type: 'admin',
      sender_name: 'GlobalTrack Admin',
      message_type: 'text',
      content: replyText.trim(),
      status: 'delivered',
      created_at: new Date().toISOString(),
    };
    sendAdminMessage(newMsg);
    setReplyText('');
  };

  // Edit Message Handler
  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: editContent.trim(), is_edited: true } : m))
    );
    setEditingId(null);
    setEditContent('');

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_edit',
        payload: { id: msgId, content: editContent.trim() },
      });
    }

    try {
      await supabase.from('chat_messages').update({ content: editContent.trim() }).eq('id', msgId);
    } catch (e) {}
  };

  // Delete Message Handler
  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_delete',
        payload: { id: msgId },
      });
    }

    try {
      await supabase.from('chat_messages').delete().eq('id', msgId);
    } catch (e) {}
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        tracking_number: activeTracking !== 'General Queries' ? activeTracking : null,
        sender_type: 'admin',
        sender_name: 'GlobalTrack Admin',
        message_type: 'image',
        file_url: base64,
        file_name: file.name,
        content: 'Official Package Update Image',
        status: 'delivered',
        created_at: new Date().toISOString(),
      };
      sendAdminMessage(newMsg);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        tracking_number: activeTracking !== 'General Queries' ? activeTracking : null,
        sender_type: 'admin',
        sender_name: 'GlobalTrack Admin',
        message_type: 'file',
        file_url: base64,
        file_name: file.name,
        file_size: `${sizeMB} MB`,
        content: `Document: ${file.name}`,
        status: 'delivered',
        created_at: new Date().toISOString(),
      };
      sendAdminMessage(newMsg);
    };
    reader.readAsDataURL(file);
  };

  const startAdminRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            tracking_number: activeTracking !== 'General Queries' ? activeTracking : null,
            sender_type: 'admin',
            sender_name: 'GlobalTrack Admin',
            message_type: 'voice',
            file_url: base64Audio,
            voice_duration: recordingTime,
            content: 'Admin Voice Note',
            status: 'delivered',
            created_at: new Date().toISOString(),
          };
          sendAdminMessage(newMsg);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (err) {
      alert('Microphone permission required for admin voice notes.');
    }
  };

  const stopAdminRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const newAudio = new Audio(url);
      audioRef.current = newAudio;
      newAudio.play();
      setPlayingAudioId(id);
      newAudio.onended = () => setPlayingAudioId(null);
    }
  };

  return (
    <div className="max-w-7xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[780px] relative">
      {/* Toast Alert Pop-up Notification for Admin */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={() => selectConversation(activeToast.tracking)}
            className="absolute top-4 right-4 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/50 cursor-pointer flex items-center space-x-3 max-w-md animate-bounce"
          >
            <div className="bg-blue-600 p-2.5 rounded-xl shrink-0">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wider">New Customer Message</span>
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-300">Ref: {activeToast.tracking}</p>
              <p className="text-sm font-semibold truncate text-slate-100">{activeToast.msg.content || 'Sent an attachment'}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActiveToast(null); }} className="text-slate-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar: Conversations Inbox */}
      <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Live Support Desk
            </h3>
            <p className="text-xs text-slate-500 font-medium">Real-time user inquiries & shipments</p>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow">
                {unreadCount}
              </span>
            )}
            <button
              onClick={fetchMessages}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
              title="Refresh Inquiries"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking # or receiver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {trackingConversations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No tracking numbers found.
            </div>
          ) : (
            trackingConversations.map((tn) => {
              const tnMsgs = messages.filter((m) =>
                tn === 'General Queries' ? !m.tracking_number : m.tracking_number === tn
              );
              const lastMsg = tnMsgs[tnMsgs.length - 1];
              const shipment = shipmentsList.find((s) => s.tracking_number === tn);
              const isSelected = activeTracking === tn;
              const hasUnread = tnMsgs.some((m) => m.sender_type === 'user' && m.status !== 'read');

              return (
                <div
                  key={tn}
                  onClick={() => selectConversation(tn)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold flex items-center gap-1.5 truncate">
                      <Package className="h-3.5 w-3.5 shrink-0" />
                      {tn}
                    </span>
                    <span className={`text-[10px] font-mono shrink-0 ml-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {lastMsg ? formatRelativeTime(lastMsg.created_at) : !lastMsg && shipment ? 'NEW' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {lastMsg
                        ? lastMsg.content || (lastMsg.file_url ? 'Attachment file' : 'Voice note')
                        : shipment?.receiver_name
                        ? `Receiver: ${shipment.receiver_name}`
                        : 'New shipment (Click to chat)'}
                    </p>
                    {hasUnread && !isSelected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 ml-2 animate-ping"></span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Workspace Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                {activeTracking ? `Active Session: ${activeTracking}` : 'Select a Conversation'}
              </h4>
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Socket Telemetry Active &bull; Real-time Sync
              </p>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div ref={scrollContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900/90">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-blue-600/20 text-blue-400 p-4 rounded-2xl mb-3 border border-blue-500/30">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-white text-base mb-1 font-mono">
                Initiate Chat for {activeTracking}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                This tracking number has no previous message history. Type a message below to send an update directly to the customer!
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => {
            const isAdmin = msg.sender_type === 'admin';
            const isEditing = editingId === msg.id;

            return (
              <div key={msg.id} className={`flex flex-col group ${isAdmin ? 'items-end' : 'items-start'}`}>
                {/* Meta Header */}
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mb-1 px-1">
                  <span>{msg.sender_name || (isAdmin ? 'Admin' : 'User')}</span>
                  <span>&bull;</span>
                  <span>{formatRelativeTime(msg.created_at)}</span>
                  {msg.is_edited && <span className="text-blue-400 italic">(edited)</span>}
                </div>

                <div className="relative flex items-center max-w-[80%] gap-2">
                  {/* Action Menu (Edit / Delete) for Admin or User Messages */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ${isAdmin ? 'order-first' : 'order-last'}`}>
                    {msg.message_type === 'text' && (
                      <button
                        onClick={() => { setEditingId(msg.id); setEditContent(msg.content || ''); }}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Message"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`w-full p-4 rounded-2xl text-sm shadow-md font-medium ${
                      isAdmin
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    {/* Inline Edit Form */}
                    {isEditing ? (
                      <div className="space-y-2 min-w-[240px]">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(msg.id)}
                          className="w-full bg-slate-900 border border-blue-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2 text-xs">
                          <button onClick={() => setEditingId(null)} className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200">
                            Cancel
                          </button>
                          <button onClick={() => handleSaveEdit(msg.id)} className="px-2.5 py-1 bg-blue-500 hover:bg-blue-400 rounded-lg text-white font-bold">
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Text Message */}
                        {msg.content && msg.message_type === 'text' && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                        {/* Image Attachment */}
                        {msg.message_type === 'image' && msg.file_url && (
                          <div className="space-y-2">
                            <img
                              src={msg.file_url}
                              alt="Uploaded Attachment"
                              className="max-h-60 rounded-xl object-cover border border-slate-700/50"
                            />
                            {msg.content && <p className="text-xs opacity-90">{msg.content}</p>}
                          </div>
                        )}

                        {/* File Attachment */}
                        {msg.message_type === 'file' && (
                          <div className="flex items-center space-x-3 bg-slate-950/40 p-3 rounded-xl border border-slate-700/50">
                            <FileText className="h-8 w-8 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{msg.file_name || 'Attached File'}</p>
                              <p className="text-[10px] text-slate-400">{msg.file_size}</p>
                            </div>
                            {msg.file_url && (
                              <a
                                href={msg.file_url}
                                download={msg.file_name || 'document'}
                                className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Voice Note */}
                        {msg.message_type === 'voice' && msg.file_url && (
                          <div className="flex items-center space-x-3 bg-slate-950/40 p-3 rounded-xl border border-slate-700/50 min-w-[200px]">
                            <button
                              onClick={() => togglePlayAudio(msg.id, msg.file_url!)}
                              className="p-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-full transition-colors shadow shrink-0"
                            >
                              {playingAudioId === msg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                            </button>
                            <div>
                              <div className="flex items-center space-x-1 h-4">
                                <span className="w-1 bg-blue-400 h-3 rounded animate-pulse"></span>
                                <span className="w-1 bg-blue-400 h-5 rounded animate-pulse"></span>
                                <span className="w-1 bg-blue-400 h-2 rounded"></span>
                                <span className="w-1 bg-blue-400 h-4 rounded"></span>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                Voice Note &bull; {msg.voice_duration ? `${msg.voice_duration}s` : 'Audio'}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delivery Ticks for Sent Messages */}
                    {isAdmin && (
                      <div className="flex justify-end mt-1 space-x-1">
                        {msg.status === 'read' ? (
                          <span title="Seen / Read" className="text-cyan-300 flex items-center">
                            <CheckCheck className="h-4 w-4 text-cyan-300" />
                          </span>
                        ) : (
                          <span title="Delivered" className="text-blue-200 flex items-center">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }))}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Recording Overlay for Admin */}
        {isRecording && (
          <div className="bg-red-950/90 border-t border-red-500/40 p-3 flex items-center justify-between">
            <span className="text-red-300 text-xs font-mono font-bold animate-pulse">
              🎙️ RECORDING ADMIN VOICE NOTE ({recordingTime}s)
            </span>
            <button
              onClick={stopAdminRecording}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Square className="h-3.5 w-3.5" /> Stop & Send
            </button>
          </div>
        )}

        {/* Admin Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center space-x-3">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-xl transition-colors shrink-0"
            title="Attach Package Photo"
          >
            <Image className="h-5 w-5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-xl transition-colors shrink-0"
            title="Attach File"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.zip,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={isRecording ? stopAdminRecording : startAdminRecording}
            className={`p-3 rounded-xl transition-colors shrink-0 ${
              isRecording ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
            }`}
            title="Record Admin Voice Note"
          >
            <Mic className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Type official admin reply..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />

          <button
            onClick={handleSendText}
            disabled={!replyText.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-bold transition-colors flex items-center space-x-2 text-sm shrink-0"
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
