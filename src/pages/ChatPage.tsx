import { useEffect, useRef, useState, FormEvent } from 'react';
import { fetchThreads, fetchMessages, sendMessage } from "../services/api";
import type { MessageThread, Message } from '../types';

export default function ChatPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState<string>('');
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    fetchThreads().then((t: MessageThread[]) => {
      setThreads(t);
      setActiveId(t[0]?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const load = () => fetchMessages(activeId).then(setMsgs);
    load();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(load, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    await sendMessage(activeId, text.trim());
    setText('');
    const updated = await fetchMessages(activeId);
    setMsgs(updated);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  return (
    <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 160px)' }}>
      <aside className="col-span-4 bg-white rounded-xl shadow overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b font-semibold">Chats</div>
        <div className="flex-1 overflow-y-auto">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${activeId === t.id ? 'bg-gray-100' : ''}`}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500">Updated {new Date(t.updated_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="col-span-8 bg-white rounded-xl shadow flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Conversation</div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {msgs.map(m => (
            <div key={m.id} className="max-w-[70%]">
              <div className={`px-3 py-2 rounded-xl text-sm ${m.sender_id === (localStorage.getItem('sid')||'demo') ? 'bg-blue-600 text-white ml-auto' : 'bg-white border'}`}
                   style={{ width: 'fit-content' }}>
                {m.content}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <form onSubmit={onSend} className="p-3 border-t flex items-center gap-3">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message"
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e); } }}
          />
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Send</button>
        </form>
      </section>
    </div>
  );
}


