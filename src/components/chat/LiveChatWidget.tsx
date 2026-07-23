'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Image, Paperclip, Mic, Square, 
  Play, Pause, FileText, Download, Sparkles, Volume2, Bell,
  Check, CheckCheck, Pencil, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { formatRelativeTime } from '@/lib/formatTime';

interface LiveChatWidgetProps {
  trackingNumber?: string;
  shipmentId?: string;
}

export default function LiveChatWidget({ trackingNumber, shipmentId }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<ChatMessage | null>(null);

  // Edit Message State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playing State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio notification error:', e);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('gt_user_chat_name') || `User-${Math.floor(1000 + Math.random() * 9000)}`;
    setSenderName(savedName);
    localStorage.setItem('gt_user_chat_name', savedName);

    fetchMessages();

    // Unified persistent channel subscription for all user and admin live chats
    const channel = supabase.channel('global_live_chat');
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (trackingNumber && newMsg.tracking_number && newMsg.tracking_number !== trackingNumber) return;
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
          if (trackingNumber && newMsg.tracking_number && newMsg.tracking_number !== trackingNumber) return;
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
          if (!tracking_number || tracking_number === trackingNumber) {
            setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [trackingNumber]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      markAllAsRead();
      scrollToBottom(true);
    }
  }, [isOpen]);

  const handleIncomingMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    if (newMsg.sender_type === 'admin') {
      playNotificationSound();
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
        setActiveToast(newMsg);
        setTimeout(() => setActiveToast(null), 5000);
      } else {
        scrollToBottom(false);
      }
    } else {
      scrollToBottom(false);
    }
  };

  const markAllAsRead = async () => {
    setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' })));
    setUnreadCount(0);
    setActiveToast(null);
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_read',
        payload: { tracking_number: trackingNumber },
      });
    }
  };

  const fetchMessages = async () => {
    try {
      let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (trackingNumber) {
        query = query.eq('tracking_number', trackingNumber);
      }
      const { data, error } = await query;
      if (error) {
        console.error('fetchMessages error:', error.message);
      }
      if (!error && data && data.length > 0) {
        setMessages(data);
        if (!isOpen) {
          const unreadAdminMsgs = data.filter((m) => m.sender_type === 'admin' && m.status !== 'read');
          setUnreadCount(unreadAdminMsgs.length);
        }
        scrollToBottom(true);
      } else {
        setMessages([
          {
            id: 'welcome_1',
            sender_type: 'admin',
            sender_name: 'GlobalTrack Support',
            message_type: 'text',
            content: `Hello! 👋 How can we assist you with ${trackingNumber ? `package ${trackingNumber}` : 'your logistics query'} today?`,
            status: 'read',
            created_at: new Date().toISOString(),
          },
        ]);
        scrollToBottom(true);
      }
    } catch (err) {
      console.error('fetchMessages catch:', err);
    }
  };

  const scrollToBottom = (force = false) => {
    const doScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      if (force) {
        container.scrollTop = container.scrollHeight;
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      } else {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    doScroll();
    setTimeout(doScroll, 50);
    setTimeout(doScroll, 150);
  };

  const broadcastMessage = async (msg: ChatMessage) => {
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
      shipment_id: shipmentId || null,
      tracking_number: trackingNumber || null,
      sender_type: msg.sender_type,
      sender_name: msg.sender_name,
      message_type: msg.message_type,
      content: msg.content || null,
      file_url: msg.file_url || null,
      file_name: msg.file_name || null,
      file_size: msg.file_size || null,
      voice_duration: msg.voice_duration || null,
    };

    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) {
      console.error('Failed to insert chat message into database:', error.message);
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

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      tracking_number: trackingNumber,
      shipment_id: shipmentId,
      sender_type: 'user',
      sender_name: senderName,
      message_type: 'text',
      content: inputMessage.trim(),
      status: 'delivered',
      created_at: new Date().toISOString(),
    };

    broadcastMessage(newMsg);
    setInputMessage('');
  };

  // Edit User Message
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

  // Delete User Message
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
        tracking_number: trackingNumber,
        shipment_id: shipmentId,
        sender_type: 'user',
        sender_name: senderName,
        message_type: 'image',
        file_url: base64,
        file_name: file.name,
        content: 'Shared package image',
        status: 'delivered',
        created_at: new Date().toISOString(),
      };
      broadcastMessage(newMsg);
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
        tracking_number: trackingNumber,
        shipment_id: shipmentId,
        sender_type: 'user',
        sender_name: senderName,
        message_type: 'file',
        file_url: base64,
        file_name: file.name,
        file_size: `${sizeMB} MB`,
        content: `Document: ${file.name}`,
        status: 'delivered',
        created_at: new Date().toISOString(),
      };
      broadcastMessage(newMsg);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            tracking_number: trackingNumber,
            shipment_id: shipmentId,
            sender_type: 'user',
            sender_name: senderName,
            message_type: 'voice',
            file_url: base64Audio,
            voice_duration: recordingTime,
            content: 'Voice Note',
            status: 'delivered',
            created_at: new Date().toISOString(),
          };
          broadcastMessage(newMsg);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
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

  const sendQuickAction = (text: string) => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      tracking_number: trackingNumber,
      shipment_id: shipmentId,
      sender_type: 'user',
      sender_name: senderName,
      message_type: 'text',
      content: text,
      status: 'delivered',
      created_at: new Date().toISOString(),
    };
    broadcastMessage(newMsg);
  };

  return (
    <>
      {/* Toast Popup Notification when closed */}
      <AnimatePresence>
        {activeToast && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/40 cursor-pointer flex items-center space-x-3 max-w-sm"
          >
            <div className="bg-blue-600 p-2.5 rounded-xl shrink-0">
              <Bell className="h-5 w-5 text-white animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">New Support Message</p>
              <p className="text-sm font-semibold truncate text-slate-100">{activeToast.content || 'Sent a media message'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)] flex items-center justify-center border border-blue-400/30"
          title="Open Live Chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Chat Drawer Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[590px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-md">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    Live Customer Support
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase">Online</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {trackingNumber ? `Ref: ${trackingNumber}` : 'Real-Time Telemetry Desk'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="bg-slate-950/80 px-3 py-2 border-b border-slate-800/60 flex gap-2 overflow-x-auto scrollbar-hide text-xs">
              <button
                onClick={() => sendQuickAction('Please provide current package picture')}
                className="shrink-0 bg-slate-800/80 hover:bg-slate-800 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium transition-colors"
              >
                📷 Request Photo
              </button>
              <button
                onClick={() => sendQuickAction('What is the estimated delivery time?')}
                className="shrink-0 bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium transition-colors"
              >
                ⏱️ Delivery Time
              </button>
              <button
                onClick={() => sendQuickAction('I need to update my delivery address')}
                className="shrink-0 bg-slate-800/80 hover:bg-slate-800 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-full font-medium transition-colors"
              >
                📍 Update Address
              </button>
            </div>

            {/* Message History Container */}
            <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
              {messages.map((msg) => {
                const isUser = msg.sender_type === 'user';
                const isEditing = editingId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mb-1 px-1">
                      <span>{msg.sender_name || (isUser ? 'You' : 'Support')}</span>
                      <span>&bull;</span>
                      <span>{formatRelativeTime(msg.created_at)}</span>
                      {msg.is_edited && <span className="text-blue-400 italic">(edited)</span>}
                    </div>

                    <div className="relative flex items-center max-w-[85%] gap-1.5">
                      {/* Action Menu (Edit / Delete) for User */}
                      {isUser && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 order-first">
                          {msg.message_type === 'text' && (
                            <button
                              onClick={() => { setEditingId(msg.id); setEditContent(msg.content || ''); }}
                              className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                              title="Edit Message"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                            title="Delete Message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`w-full p-3.5 rounded-2xl text-xs md:text-sm font-medium shadow-md ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-bl-none'
                        }`}
                      >
                        {/* Inline Edit Form */}
                        {isEditing ? (
                          <div className="space-y-2 min-w-[200px]">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(msg.id)}
                              className="w-full bg-slate-900 border border-blue-300 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2 text-[10px]">
                              <button onClick={() => setEditingId(null)} className="px-2 py-0.5 bg-slate-700 rounded text-slate-200">
                                Cancel
                              </button>
                              <button onClick={() => handleSaveEdit(msg.id)} className="px-2 py-0.5 bg-blue-500 rounded text-white font-bold">
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Text Content */}
                            {msg.content && msg.message_type === 'text' && (
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Image Message */}
                            {msg.message_type === 'image' && msg.file_url && (
                              <div className="space-y-1">
                                <img
                                  src={msg.file_url}
                                  alt="Chat Attachment"
                                  className="max-h-48 w-full object-cover rounded-xl border border-slate-700/60"
                                />
                                {msg.content && <p className="text-xs opacity-90 mt-1">{msg.content}</p>}
                              </div>
                            )}

                            {/* File Message */}
                            {msg.message_type === 'file' && (
                              <div className="flex items-center space-x-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/50">
                                <FileText className="h-7 w-7 text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate text-xs">{msg.file_name || 'Document'}</p>
                                  <p className="text-[10px] text-slate-400">{msg.file_size || 'File Attachment'}</p>
                                </div>
                                {msg.file_url && (
                                  <a
                                    href={msg.file_url}
                                    download={msg.file_name || 'attachment'}
                                    className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition-colors"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Voice Note Message */}
                            {msg.message_type === 'voice' && msg.file_url && (
                              <div className="flex items-center space-x-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/50 min-w-[180px]">
                                <button
                                  onClick={() => togglePlayAudio(msg.id, msg.file_url!)}
                                  className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full transition-colors shadow-md shrink-0"
                                >
                                  {playingAudioId === msg.id ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4 ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-1 h-4">
                                    <span className="w-1 bg-blue-400 h-2 rounded animate-pulse"></span>
                                    <span className="w-1 bg-blue-400 h-4 rounded animate-pulse"></span>
                                    <span className="w-1 bg-blue-400 h-3 rounded animate-pulse"></span>
                                    <span className="w-1 bg-blue-400 h-1 rounded"></span>
                                    <span className="w-1 bg-blue-400 h-3 rounded"></span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 mt-1 block">
                                    Voice Note &bull; {msg.voice_duration ? `${msg.voice_duration}s` : 'Audio'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Delivery Ticks for User Messages */}
                        {isUser && (
                          <div className="flex justify-end mt-1 space-x-1">
                            {msg.status === 'read' ? (
                              <span title="Seen / Read" className="text-cyan-300 flex items-center">
                                <CheckCheck className="h-3.5 w-3.5 text-cyan-300" />
                              </span>
                            ) : (
                              <span title="Delivered" className="text-blue-200 flex items-center">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice Recording Overlay / Controls */}
            {isRecording && (
              <div className="bg-red-950/80 border-t border-red-500/30 p-3 flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-2 text-red-300 text-xs font-bold font-mono">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-ping"></span>
                  <span>RECORDING VOICE NOTE... ({recordingTime}s)</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Square className="h-3.5 w-3.5" /> Send Voice
                </button>
              </div>
            )}

            {/* Footer Input Controls */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Send Image"
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
                className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Attach Document"
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
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                  isRecording
                    ? 'bg-red-600 text-white animate-bounce'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                }`}
                title="Record Voice Note"
              >
                <Mic className="h-5 w-5" />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
