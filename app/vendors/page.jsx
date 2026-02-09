"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";
import { getAllInvoices } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import PageHeader from "@/components/Layout/PageHeader";

export default function VendorPortal() {
    const router = useRouter();
    const { user, logout, isLoading: authLoading } = useAuth();
    const logoutRef = useRef(logout);
    logoutRef.current = logout;
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchIdRef = useRef(0);

    const fetchSubmissions = useCallback(async () => {
        const thisFetchId = ++fetchIdRef.current;
        try {
            const data = await getAllInvoices();
            if (thisFetchId !== fetchIdRef.current) return;
            setAllSubmissions(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch vendor submissions", e);
            if (thisFetchId !== fetchIdRef.current) return;
            if (e?.message === "Unauthorized") logoutRef.current?.();
        } finally {
            if (thisFetchId === fetchIdRef.current) setLoading(false);
        }
    }, []);

    // Project & PM Selection State
    const [projects, setProjects] = useState([]);
    const [pms, setPms] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedPM, setSelectedPM] = useState("");
    const [metadataLoading, setMetadataLoading] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/vendor/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    }, []);

    const handleProjectChange = async (projectId) => {
        setSelectedProject(projectId);
        setSelectedPM("");
        setPms([]);

        if (!projectId) return;

        setMetadataLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/pms`);
            if (res.ok) {
                const data = await res.json();
                setPms(data);
            }
        } catch (error) {
            console.error("Failed to fetch PMs", error);
        } finally {
            setMetadataLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, fetchProjects]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 2000);
        return () => clearInterval(interval);
    }, [user, authLoading, router, fetchSubmissions]);

    const stats = useMemo(() => {
        const total = allSubmissions.length;
        const paid = allSubmissions.filter((i) => i.status === "PAID").length;
        const pending = allSubmissions.filter((i) => !["PAID", "REJECTED"].includes(i.status)).length;
        const amount = allSubmissions.reduce((sum, i) => sum + (parseFloat(i.amount || i.totalAmount) || 0), 0);
        return { total, paid, pending, amount };
    }, [allSubmissions]);

    const handleUploadComplete = useCallback(() => {
        setLoading(true);
        fetchSubmissions();
        setTimeout(fetchSubmissions, 800);
    }, [fetchSubmissions]);

    const getStatusStyle = (status) => {
        switch (status) {
            case "PAID":
                return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case "VERIFIED":
            case "APPROVED":
                return "text-blue-600 bg-blue-50 border-blue-100";
            case "REJECTED":
                return "text-rose-600 bg-rose-50 border-rose-100";
            case "DIGITIZING":
            case "RECEIVED":
                return "text-amber-600 bg-amber-50 border-amber-100 animate-pulse";
            default:
                return "text-slate-500 bg-slate-50 border-slate-100";
        }
    };

    const [viewerInvoiceId, setViewerInvoiceId] = useState(null);
    const [viewerLoading, setViewerLoading] = useState(true);

    const handleDownloadCSV = () => {
        if (allSubmissions.length === 0) {
            alert("No submissions to export.");
            return;
        }
        const headers = ["Invoice ID", "Original Name", "Date", "Amount", "Status"];
        const csvContent = [
            headers.join(","),
            ...allSubmissions.map((inv) =>
                [
                    inv.id,
                    `"${inv.originalName || "Invoice"}"`,
                    inv.date || new Date(inv.receivedAt).toLocaleDateString(),
                    inv.amount || inv.totalAmount || 0,
                    inv.status,
                ].join(",")
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `vendor_export_${new Date().toISOString().split("T")[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto h-full pb-10">
            <PageHeader
                title="Vendor Hub"
                subtitle="Seamlessly manage your billing, track payments in real-time, and resolve discrepancies instantly."
                icon="Package"
                accent="teal"
                roleLabel="Vendor"
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setLoading(true); fetchSubmissions(); }}
                            className="h-10 px-5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-sm"
                        >
                            <Icon name="RefreshCw" size={18} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadCSV}
                            className="h-10 px-5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-sm"
                        >
                            <Icon name="Download" size={18} /> Export CSV
                        </button>
                    </div>
                }
            />

            {/* Stats cards - previous teal/emerald/amber/blue theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Submissions", value: stats.total, icon: "FileText", color: "teal" },
                    { label: "Paid Invoices", value: stats.paid, icon: "CheckCircle", color: "emerald" },
                    { label: "Pending Approval", value: stats.pending, icon: "Clock", color: "amber" },
                    { label: "Total Volume", value: `₹${stats.amount.toLocaleString()}`, icon: "BarChart3", color: "blue" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/40 relative overflow-hidden group"
                    >
                        <div className={clsx(
                            "absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full -mr-12 -mt-12 transition-colors",
                            stat.color === "teal" && "bg-teal-500/10 group-hover:bg-teal-500/20",
                            stat.color === "emerald" && "bg-emerald-500/10 group-hover:bg-emerald-500/20",
                            stat.color === "amber" && "bg-amber-500/10 group-hover:bg-amber-500/20",
                            stat.color === "blue" && "bg-blue-500/10 group-hover:bg-blue-500/20"
                        )} />
                        <div className="flex items-center gap-4 mb-3">
                            <div className={clsx(
                                "p-2.5 rounded-xl",
                                stat.color === "teal" && "bg-teal-50 text-teal-600",
                                stat.color === "emerald" && "bg-emerald-50 text-emerald-600",
                                stat.color === "amber" && "bg-amber-50 text-amber-600",
                                stat.color === "blue" && "bg-blue-50 text-blue-600"
                            )}>
                                <Icon name={stat.icon} size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                        </div>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Manual Submission Portal */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col lg:flex-row">
                <div className="lg:w-1/3 p-8 md:p-12 space-y-8 bg-slate-50/50 border-r border-slate-100">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Invoice <span className="text-teal-600">Submission</span></h2>
                        <p className="text-slate-500 mt-2 font-medium">Please fill in the details below to submit your invoice.</p>
                    </div>
                    <div className="space-y-4">
                        {[
                            { icon: "CheckCircle", title: "Accuracy First", text: "Ensure all details match your uploaded invoice." },
                            { icon: "Shield", title: "Secure Upload", text: "Your data is encrypted and secure." },
                            { icon: "Clock", title: "Fast Processing", text: "Manual entry speeds up approvals." },
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 p-4 hover:bg-white rounded-2xl transition-colors">
                                <div className="p-2 bg-teal-100 text-teal-700 rounded-lg h-fit">
                                    <Icon name={item.icon} size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                                    <p className="text-[11px] text-slate-500 font-medium">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:w-2/3 p-8 md:p-12">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!selectedProject || !selectedPM) {
                            alert("Please select a Project and PM.");
                            return;
                        }
                        const form = e.target;
                        const formData = new FormData(form);
                        const file = formData.get('file');
                        if (!file || file.size === 0) {
                            alert("Please upload an invoice file.");
                            return;
                        }

                        setLoading(true);
                        try {
                            // Construct metadata object
                            const metadata = {
                                projectId: selectedProject,
                                assignedPM: selectedPM,
                                invoiceNumber: formData.get('invoiceNumber'),
                                date: formData.get('date'),
                                amount: formData.get('amount'),
                                dueDate: formData.get('dueDate')
                            };

                            // Call ingestInvoice with file and metadata
                            await import("@/lib/api").then(mod => mod.ingestInvoice(file, metadata));

                            alert("Invoice submitted successfully!");
                            form.reset();
                            setSelectedProject("");
                            setSelectedPM("");
                            handleUploadComplete(); // Refresh list
                        } catch (error) {
                            console.error("Submission failed", error);
                            alert("Failed to submit invoice. Please try again.");
                        } finally {
                            setLoading(false);
                        }
                    }} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
                                <select
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                    value={selectedProject}
                                    onChange={(e) => handleProjectChange(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.ringiNumber})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Manager</label>
                                <select
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all disabled:opacity-50"
                                    value={selectedPM}
                                    onChange={(e) => setSelectedPM(e.target.value)}
                                    disabled={!selectedProject || metadataLoading}
                                    required
                                >
                                    <option value="">-- Select PM --</option>
                                    {pms.map(pm => (
                                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Number</label>
                                <input
                                    type="text"
                                    name="invoiceNumber"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                    placeholder="e.g. INV-2024-001"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Amount (INR)</label>
                                <input
                                    type="number"
                                    name="amount"
                                    step="0.01"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Invoice (PDF/Image)</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    name="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="file-input file-input-bordered file-input-primary w-full h-12 rounded-xl bg-white"
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Max 15MB. PDF, JPG, PNG supported.</p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="h-12 px-8 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 hover:shadow-xl transition-all flex items-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <span className="loading loading-spinner"></span> : <Icon name="Send" size={18} />}
                                Submit Invoice
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Submissions Intelligence - previous dark header table */}
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Icon name="Activity" size={18} />
                    </div>
                    Submissions Intelligence
                </h2>
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800">
                                    <th className="px-10 py-6">Document Identity</th>
                                    <th className="px-6 py-6 border-l border-white/5">Submitted On</th>
                                    <th className="px-6 py-6 border-l border-white/5">Gross Amount</th>
                                    <th className="px-6 py-6 border-l border-white/5">Workflow Status</th>
                                    <th className="px-10 py-6 text-right">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-10 py-6 bg-slate-50/50">
                                                <div className="h-10 bg-slate-200 rounded-2xl w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : allSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-20 text-center">
                                            <div className="max-w-xs mx-auto space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                                    <Icon name="Inbox" size={32} />
                                                </div>
                                                <p className="text-lg font-black text-slate-400">No Submissions Found</p>
                                                <p className="text-xs text-slate-400 font-medium">Your uploaded documents will appear here in real-time as they are processed.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    allSubmissions.slice(0, 10).map((inv, idx) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                                            className="group hover:bg-slate-50/80 transition-colors cursor-default"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex items-center justify-center">
                                                        <Icon name="FileText" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{inv.originalName || "Corporate Invoice"}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-tighter">REF: {inv.id.slice(0, 12)}…</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 border-l border-slate-50 font-bold text-slate-500 text-sm italic tracking-tight">
                                                {new Date(inv.receivedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-6 py-6 border-l border-slate-50">
                                                <p className="font-black text-slate-900 text-sm">
                                                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(inv.amount || 0)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6 border-l border-slate-50">
                                                <span className={clsx(
                                                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm inline-flex items-center gap-2",
                                                    getStatusStyle(inv.status)
                                                )}>
                                                    <span className={clsx("w-1.5 h-1.5 rounded-full", inv.status === "DIGITIZING" ? "bg-amber-500 animate-pulse" : "bg-current opacity-40")} />
                                                    {inv.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right border-l border-slate-50">
                                                <button
                                                    type="button"
                                                    onClick={() => { setViewerInvoiceId(inv.id); setViewerLoading(true); }}
                                                    className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                    title="View document"
                                                >
                                                    <Icon name="ExternalLink" size={18} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* Document viewer modal */}
            <AnimatePresence>
                {viewerInvoiceId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setViewerInvoiceId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-[101] flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
                                <span className="font-semibold text-gray-800 text-sm truncate">
                                    {allSubmissions.find((i) => i.id === viewerInvoiceId)?.originalName || `Invoice ${viewerInvoiceId}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewerInvoiceId(null)}
                                    className="btn btn-ghost btn-sm btn-square"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                            <div className="flex-1 min-h-[70vh] bg-gray-100 relative">
                                {viewerLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                        <span className="loading loading-spinner loading-lg text-primary" />
                                    </div>
                                )}
                                <iframe
                                    src={`/api/invoices/${viewerInvoiceId}/file`}
                                    title="Invoice document"
                                    className="w-full h-full min-h-[70vh] border-0"
                                    onLoad={() => setViewerLoading(false)}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
