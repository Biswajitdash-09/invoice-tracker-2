"use client";

import { useEffect, useState } from "react";
import { getAllInvoices } from "@/lib/api";
import InvoiceList from "@/components/Digitization/InvoiceList";
import Icon from "@/components/Icon";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function DigitizationPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading digitization queue...</div>}>
        <DigitizationPageContent />
      </Suspense>
    </div>
  );
}

function DigitizationPageContent() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  useEffect(() => {
    const loadData = async () => {
      try {
        const allInvoices = await getAllInvoices();
        let filteredInvoices = allInvoices;

        if (statusFilter) {
          filteredInvoices = allInvoices.filter(inv => inv.status === statusFilter);
        }

        setInvoices(filteredInvoices);
      } catch (e) {
        console.error("Failed to load invoices from backend", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Polling for updates on "DIGITIZING" or "RECEIVED" invoices
    const pollInterval = setInterval(async () => {
      try {
        const remoteInvoices = await getAllInvoices();
        let filteredRemote = remoteInvoices;

        if (statusFilter) {
          filteredRemote = remoteInvoices.filter(inv => inv.status === statusFilter);
        }
        setInvoices(filteredRemote);
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Icon name="ScanLine" size={28} />
            </div>
            Digitization Queue
          </h1>
          <p className="text-gray-500 mt-2 ml-14 max-w-xl">
            Review, validate, and process incoming invoices. The AI pre-fills data for your verification.
          </p>
        </div>
        <div className="flex gap-3">
        <div className="join shadow-sm border border-white/40 rounded-lg">
          <button className="join-item btn btn-sm bg-white/50 border-none hover:bg-white"><Icon name="List" size={18} /></button>
          <button className="join-item btn btn-sm bg-primary text-white border-none"><Icon name="Grid" size={18} /></button>
        </div>
        <button className="btn btn-sm btn-ghost bg-white/40 border border-white/60 shadow-sm gap-2">
          <Icon name="Filter" size={16} /> Filter
        </button>
        </div>
      </div>

      {/* Stats Summary (Mini) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 flex flex-col">
          <span className="text-xs font-bold uppercase opacity-70">To Digitize</span>
          <span className="text-2xl font-bold">{invoices.filter(i => i.status === 'RECEIVED').length}</span>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 flex flex-col">
          <span className="text-xs font-bold uppercase opacity-70">Processing</span>
          <span className="text-2xl font-bold">{invoices.filter(i => i.status === 'DIGITIZING' || i.status === 'VERIFIED').length}</span>
        </div>
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 flex flex-col">
          <span className="text-xs font-bold uppercase opacity-70">Pending Approval</span>
          <span className="text-2xl font-bold">{invoices.filter(i => i.status === 'PENDING_APPROVAL').length}</span>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 flex flex-col">
          <span className="text-xs font-bold uppercase opacity-70">Completed Today</span>
          <span className="text-2xl font-bold">{invoices.filter(i => i.status === 'PAID' || i.status === 'APPROVED').length}</span>
        </div>
      </div>

      {/* Main List */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-gray-500 animate-pulse">Loading invoices...</p>
          </div>
        ) : (
          <InvoiceList invoices={invoices} />
        )}
      </div>
    </div>
  );
}