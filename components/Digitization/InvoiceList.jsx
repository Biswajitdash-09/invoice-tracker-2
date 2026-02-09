"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";

const InvoiceList = ({ invoices }) => {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white/20 rounded-2xl border border-white/40 backdrop-blur-md">
        <Icon name="Inbox" size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">No invoices waiting for digitization.</p>
      </div>
    );
  }

  // Filter only relevant statuses for this view if needed, but the prompt implies listing items pending digitization.
  // We'll display all, but emphasize those needing action.

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-success/10 text-success border-success/20';
      case 'Pending Approval': return 'bg-warning/10 text-warning border-warning/20';
      case 'Issue Detected':
      case 'Validation Required': return 'bg-error/10 text-error border-error/20';
      case 'Processing': return 'bg-info/10 text-info border-info/20';
      case 'Verified': return 'bg-success/10 text-success border-success/20';
      case 'Match Discrepancy': return 'bg-error/10 text-error border-error/20';
      case 'Digitized': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Digitizing': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return 'CheckCircle';
      case 'Pending Approval': return 'Clock';
      case 'Issue Detected':
      case 'Validation Required': return 'AlertCircle';
      case 'Processing': return 'Loader';
      case 'Digitized': return 'Check';
      case 'Digitizing': return 'ScanLine';
      default: return 'FileText';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <div className="col-span-4 md:col-span-3">Vendor / ID</div>
        <div className="col-span-3 md:col-span-2">Date</div>
        <div className="col-span-2 md:col-span-2 text-right">Amount</div>
        <div className="col-span-3 md:col-span-3 text-center">Status</div>
        <div className="col-span-12 md:col-span-2 text-right hidden md:block">Action</div>
      </div>

      <div className="space-y-3">
        {invoices.map((invoice, index) => (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative grid grid-cols-12 gap-4 items-center p-4 rounded-xl bg-white/40 border border-white/50 shadow-sm hover:shadow-md hover:bg-white/60 transition-all duration-200"
          >
            {/* Vendor & ID */}
            <div className="col-span-8 md:col-span-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getStatusColor(invoice.status)}`}>
                <Icon name={getStatusIcon(invoice.status)} size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{invoice.vendorName}</h3>
                <p className="text-xs text-gray-500 font-mono">{invoice.id}</p>
              </div>
            </div>

            {/* Date - Hidden on very small screens if needed, but grid handles it */}
            <div className="col-span-4 md:col-span-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Icon name="Calendar" size={14} className="text-gray-400" />
                {invoice.date}
              </div>
            </div>

            {/* Amount */}
            <div className="col-span-4 md:col-span-2 text-right font-bold text-gray-700">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoice.amount)}
            </div>

            {/* Status */}
            <div className="col-span-4 md:col-span-3 flex flex-col items-center gap-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
              {invoice.validation?.errors?.length > 0 && (
                <span className="text-[10px] text-error font-semibold">
                  {invoice.validation.errors.length} errors found
                </span>
              )}
            </div>

            {/* Action Button */}
            <div className="col-span-4 md:col-span-2 flex justify-end">
              <Link href={`/digitization/${invoice.id}`} className="w-full md:w-auto">
                <button className="btn btn-sm btn-primary w-full md:w-auto text-white shadow-lg shadow-primary/20 rounded-lg group-hover:scale-105 transition-transform">
                  Process
                  <Icon name="ArrowRight" size={14} />
                </button>
              </Link>
            </div>

            {/* Mobile Action Full Width Overlay (Optional) */}
            <div className="md:hidden col-span-12 mt-2 pt-2 border-t border-gray-200/50 flex justify-end">
              <Link href={`/digitization/${invoice.id}`} className="btn btn-sm btn-ghost text-primary w-full">
                Process Invoice <Icon name="ArrowRight" size={14} />
              </Link>
            </div>

          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceList;