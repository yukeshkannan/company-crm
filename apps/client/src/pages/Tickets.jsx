import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, User, Layout, List, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import KanbanBoard from '../components/KanbanBoard';

const Tickets = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('kanban');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Columns Configuration
    const columns = [
        { id: 'Open', title: 'Open', color: '#3b82f6' },           // Blue
        { id: 'In Progress', title: 'In Progress', color: '#eab308' }, // Yellow
        { id: 'Resolved', title: 'Resolved', color: '#22c55e' },    // Green
        { id: 'Rejected', title: 'Rejected', color: '#ef4444' }     // Red
    ];

    const [editingTicket, setEditingTicket] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', priority: 'Medium', status: 'Open', customerId: '', assignedTo: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ticketRes, contactRes, userRes] = await Promise.all([
                axios.get('/api/tickets'),
                axios.get('/api/contacts'),
                axios.get('/api/auth/users')
            ]);
            
            let allTickets = ticketRes.data.data || [];
            
            // Filter: Only show assigned tickets for Employees
            // Admins see EVERYTHING
            if (user?.role === 'Employee') {
                allTickets = allTickets.filter(t => {
                    const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo;
                    const currentUserId = user.id || user._id;
                    return assignedId === currentUserId;
                });
            }

            setTickets(allTickets);
            setContacts(contactRes.data.data);
            setUsers(userRes.data?.data || []);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data", err);
            setLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;
        const newStatus = destination.droppableId;
        const ticket = tickets.find(t => t._id === draggableId);

        // Restriction Check
        if (newStatus === 'Rejected' && user?.role !== 'Admin') {
            alert("Only Admins can Reject tickets!");
            return;
        }

        if (newStatus === 'Resolved' && !['Admin', 'Employee'].includes(user?.role)) {
            alert("Only Admins and Employees can Resolve tickets!");
            return;
        }

        // Optimistic Update
        const originalTickets = [...tickets];
        setTickets(prev => prev.map(t => 
            t._id === draggableId ? { ...t, status: newStatus } : t
        ));

        // API Call
        try {
            if (ticket && ticket.status !== newStatus) {
                await axios.put(`/api/tickets/${draggableId}`, { status: newStatus });
                
                // Notifications
                // Notifications
                // Notifications
                if (newStatus === 'Resolved' || newStatus === 'Rejected') {
                    const contact = contacts.find(c => c._id === (ticket.customerId?._id || ticket.customerId));
                    
                    // 1. Notify Customer
                    if (contact?.email) {
                        try {
                            console.log(`[Notification] Sending email to ${contact.email} for status: ${newStatus}`);
                            await axios.post('/api/notifications/email', {
                                to: contact.email,
                                subject: `Ticket Update: ${ticket.title} is ${newStatus}`,
                                message: `Hello ${contact.name},<br>Your ticket "<strong>${ticket.title}</strong>" is now <strong>${newStatus}</strong>.`
                            });
                        } catch(e) { console.error("Customer Email failed", e); }
                    }

                    // 2. Notify Admins (if resolved by Employee)
                    if (newStatus === 'Resolved' && user?.role === 'Employee') {
                        const admins = users.filter(u => u.role === 'Admin');
                        for (const admin of admins) {
                            if (admin.email) {
                                try {
                                    console.log(`[Notification] Sending email to Admin ${admin.email}`);
                                    await axios.post('/api/notifications/email', {
                                        to: admin.email,
                                        subject: `Ticket Resolved: ${ticket.title}`,
                                        message: `Hello Admin,<br><br>Employee <strong>${user.name || 'An Employee'}</strong> has resolved the ticket "<strong>${ticket.title}</strong>".<br>Please review if necessary.`
                                    });
                                } catch(e) { console.error("Admin Email failed", e); }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to update status", err);
            setTickets(originalTickets);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Restriction Check for non-admins trying to Reject
        if (formData.status === 'Rejected' && user?.role !== 'Admin') {
            alert("Only Admins can Reject tickets!");
            return;
        }

        // Restriction Check for non-admins/non-employees trying to Resolve
        if (formData.status === 'Resolved' && !['Admin', 'Employee'].includes(user?.role)) {
            alert("Insufficient permissions to Resolve tickets!");
            return;
        }

        try {
            if (editingTicket) {
                await axios.put(`/api/tickets/${editingTicket._id}`, formData);
            } else {
                await axios.post('/api/tickets', formData);
            }
            fetchData();
            handleCloseDrawer();
        } catch (err) {
            alert('Failed to save ticket');
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/tickets/${id}`);
            setTickets(prev => prev.filter(t => t._id !== id));
            setShowDeleteConfirm(null);
            setIsDrawerOpen(false);
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleEdit = (ticket) => {
        setEditingTicket(ticket);
        setFormData({
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
            customerId: ticket.customerId?._id || ticket.customerId || '',
            assignedTo: ticket.assignedTo?._id || ticket.assignedTo || ''
        });
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setEditingTicket(null);
        setFormData({ title: '', description: '', priority: 'Medium', status: 'Open', customerId: '', assignedTo: '' });
    };

    const getPriorityStyle = (priority) => {
        switch(priority) {
            case 'Critical': return 'bg-red-100 text-red-600';
            case 'High': return 'bg-orange-100 text-orange-600';
            case 'Medium': return 'bg-blue-50 text-blue-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const renderCard = (ticket) => {
        const contact = contacts.find(c => c._id === (ticket.customerId?._id || ticket.customerId));
        const assignedUser = users.find(u => u._id === (ticket.assignedTo?._id || ticket.assignedTo));
        
        return (
            <div onClick={() => handleEdit(ticket)} className="cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                    </span>
                    {ticket.createdAt && (
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>

                <h4 className="font-bold text-slate-800 text-base mb-3 leading-snug group-hover:text-blue-700 transition-colors">
                    {ticket.title}
                </h4>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                    {/* Customer */}
                    <div className="flex items-center gap-2">
                        {contact ? (
                            <>
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    {contact.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{contact.name.split(' ')[0]}</span>
                                    <span className="text-[10px] text-slate-400">{contact.company || 'Direct'}</span>
                                </div>
                            </>
                        ) : ticket.guestEmail ? (
                            <>
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600">
                                    {ticket.guestName?.charAt(0) || 'G'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-amber-700">{ticket.guestName || 'Guest'}</span>
                                    <span className="text-[10px] text-amber-500 truncate max-w-[80px]">{ticket.guestEmail}</span>
                                </div>
                            </>
                        ) : <span className="text-xs text-slate-400 italic">No Customer</span>}
                    </div>

                    {/* Assignee */}
                    {assignedUser ? (
                        <div title={`Assigned to ${assignedUser.name}`} className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                            {assignedUser.name.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
                            <User size={14} className="text-slate-300" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <LoadingSpinner message="Loading Support Board..." />;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
                <div>
                     <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
                     <p className="text-slate-500 text-sm mt-1">Manage, track, and resolve customer support tickets efficiently.</p>
                </div>
                 <div className="flex gap-4">
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Layout size={16} /> Board
                        </button>
                        <button 
                             onClick={() => setViewMode('list')}
                             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} /> List
                        </button>
                    </div>
                    <button 
                        onClick={() => { handleCloseDrawer(); setIsDrawerOpen(true); }}
                        className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <Plus size={18} /> New Ticket
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'kanban' ? (
                <KanbanBoard 
                    columns={columns}
                    data={tickets}
                    onDragEnd={handleDragEnd}
                    renderCard={renderCard}
                    loading={loading}
                    layout="grid"
                />
            ) : (
                 <div className="flex-1 p-8 text-center text-slate-400 italic">List View Coming Soon</div>
            )}

            {/* Drawer */}
            {isDrawerOpen && (
                <>
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={handleCloseDrawer} />
                    <div className="fixed top-0 right-0 bottom-0 w-[500px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{editingTicket ? 'Edit Ticket' : 'New Ticket'}</h2>
                                <p className="text-slate-500 text-sm mt-0.5">{editingTicket ? 'Update ticket details.' : 'Create a new support ticket.'}</p>
                            </div>
                            <button onClick={handleCloseDrawer} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
                        </div>
                        
                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <form id="ticketForm" onSubmit={handleSubmit} className="space-y-5">
                                
                                {/* Subject - Full Width */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Subject <span className="text-red-500">*</span></label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all text-sm font-medium" 
                                        placeholder="e.g. Login page error" 
                                    />
                                </div>

                                {/* Priority & Status - Grid */}
                                <div className="grid grid-cols-2 gap-5">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Priority</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.priority} 
                                                onChange={e => setFormData({...formData, priority: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 appearance-none text-sm font-medium"
                                            >
                                                {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Status</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.status} 
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 appearance-none text-sm font-medium"
                                            >
                                                {columns.map(c => {
                                                    const isCurrent = formData.status === c.id;
                                                    // Only Admin can see/select 'Rejected' (unless it's already rejected)
                                                    if (!isCurrent && c.id === 'Rejected' && user?.role !== 'Admin') return null;
                                                    // Only Admin and Employee can see/select 'Resolved' (unless it's already resolved)
                                                    if (!isCurrent && c.id === 'Resolved' && !['Admin', 'Employee'].includes(user?.role)) return null;
                                                    return <option key={c.id} value={c.id}>{c.title}</option>;
                                                })}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer & Assignee - Grid */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Customer <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select 
                                                required 
                                                value={formData.customerId} 
                                                onChange={e => setFormData({...formData, customerId: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 appearance-none text-sm font-medium"
                                            >
                                                <option value="">Select Customer...</option>
                                                {contacts.map(c => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.name} {c.company ? `(${c.company})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Assign To</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.assignedTo} 
                                                onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 appearance-none text-sm font-medium"
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                                ))}
                                            </select>
                                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description - Full Width */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Description</label>
                                    <textarea 
                                        rows={5} 
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all resize-none text-sm" 
                                        placeholder="Detailed description of the issue..."
                                    />
                                </div>

                                {editingTicket && (
                                     <div className="pt-4 border-t border-slate-100">
                                        <button type="button" onClick={() => setShowDeleteConfirm(editingTicket)}
                                            className="w-full text-red-600 bg-red-50 hover:bg-red-100 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm">
                                            <Trash2 size={16} /> Delete Ticket
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                        
                        {/* Drawer Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={handleCloseDrawer} className="flex-1 text-slate-600 font-bold hover:bg-slate-200 py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                            <button form="ticketForm" type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors text-sm">
                                {editingTicket ? 'Save Changes' : 'Create Ticket'}
                            </button>
                        </div>
                    </div>
                </>
            )}

             {/* Delete Overlay */}
             {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl w-[400px] text-center shadow-2xl animate-in zoom-in duration-200">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Delete Ticket?</h3>
                        <p className="text-slate-500 my-4">Are you sure you want to delete <strong>{showDeleteConfirm.title}</strong>?</p>
                        <div className="flex gap-4 justify-center">
                            <button className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                            <button className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-colors" onClick={() => handleDelete(showDeleteConfirm._id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tickets;
