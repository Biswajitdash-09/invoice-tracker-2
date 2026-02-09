"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/constants/roles";
import { getAllInvoices } from "@/lib/api";
import MatchingList from "@/components/Matching/MatchingList";
import Icon from "@/components/Icon";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function MatchingPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading matching arena...</div>}>
        <MatchingPageContent />
      </Suspense>
    </div>
  )
}

function MatchingPageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (![ROLES.ADMIN, ROLES.FINANCE_USER, ROLES.PROJECT_MANAGER].includes(user.role)) {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  useEffect(() => {
    const loadData = async () => {
      try {
        const allInvoices = await getAllInvoices();
        // Filter for invoices ready for matching
        let readyForMatching = allInvoices.filter(inv =>
          ['VERIFIED', 'VALIDATION_REQUIRED', 'MATCH_DISCREPANCY', 'DIGITIZED'].includes(inv.status)
        );

        // Apply status filter from URL if present
        if (statusFilter) {
          readyForMatching = readyForMatching.filter(inv => inv.status === statusFilter);
        }

        setInvoices(readyForMatching);
      } catch (error) {
        console.error("Failed to load matching data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Icon name="GitMerge" size={28} />
            </div>
            Matching Arena
          </h1>
          <p className="text-gray-500 mt-2 ml-14 max-w-xl">
            Resolve discrepancies and validate invoices against Purchase Orders and Goods Receipts.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost bg-white/40 border border-white/60 shadow-sm gap-2">
            <Icon name="Filter" size={16} /> Filter
          </button>
          <button className="btn btn-sm btn-ghost bg-white/40 border border-white/60 shadow-sm gap-2">
            <Icon name="SortDesc" size={16} /> Sort
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <span className="loading loading-bars loading-lg text-blue-500"></span>
            <p className="text-gray-500 animate-pulse">Syncing matching data...</p>
          </div>
        ) : (
          <MatchingList invoices={invoices} />
        )}
      </div>
    </div>
  );
}