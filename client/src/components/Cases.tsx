import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Building, Factory, Clock, Check, AlertTriangle, Eye, UserCog, Users, Store, UserCheck, Filter, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/use-auth";
import CaseDetail from "./CaseDetail";
import RefreshIndicator from "./RefreshIndicator";

export default function Cases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active"); // active, closed, all
  const [stageFilter, setStageFilter] = useState("all"); // all, pre-legal, claim, judgment, enforcement
  const [currentPage, setCurrentPage] = useState(1);
  const casesPerPage = 20;
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: cases, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["/api/cases"],
    refetchInterval: 10000, // Refresh every 10 seconds for cases
    staleTime: 0, // Always consider cases data stale to ensure fresh data
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive",
      });
    },
  });

  // Fetch muted cases to show mute status icons
  const { data: mutedCasesData } = useQuery<{ mutedCaseIds: number[] }>({
    queryKey: ["/api/user/muted-cases"],
    staleTime: 30000,
  });
  const mutedCaseIds = mutedCasesData?.mutedCaseIds || [];

  // Handle scroll to case when navigated from Messages
  useEffect(() => {
    const scrollToCaseId = localStorage.getItem('scrollToCaseId');
    console.log('Cases useEffect - scrollToCaseId from localStorage:', scrollToCaseId);
    console.log('Cases useEffect - cases loaded:', cases?.length);
    if (scrollToCaseId && cases && cases.length > 0) {
      // Remove the localStorage item
      localStorage.removeItem('scrollToCaseId');
      console.log('Removed localStorage item and attempting to scroll to case:', scrollToCaseId);
      
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const caseElement = document.getElementById(`case-${scrollToCaseId}`);
        console.log('Found case element:', caseElement);
        if (caseElement) {
          caseElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a brief highlight effect
          caseElement.classList.add('ring-2', 'ring-acclaim-teal', 'ring-opacity-50');
          setTimeout(() => {
            caseElement.classList.remove('ring-2', 'ring-acclaim-teal', 'ring-opacity-50');
          }, 3000);
        }
      }, 100);
    }
  }, [cases]);

  // Filter cases by search term, status, and stage
  const filteredCases = cases?.filter((case_: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      case_.caseName.toLowerCase().includes(searchLower) ||
      case_.accountNumber.toLowerCase().includes(searchLower) ||
      case_.debtorEmail?.toLowerCase().includes(searchLower) ||
      case_.organisationName?.toLowerCase().includes(searchLower)
    );
    
    // If there's a search term, search across all cases regardless of status filter
    if (searchTerm.trim()) {
      return matchesSearch;
    }
    
    // Apply status filter when no search term is present
    const isActive = case_.status !== "resolved" && case_.status?.toLowerCase() !== "closed";
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && isActive) ||
                         (statusFilter === "closed" && !isActive);
    
    // Apply stage filter
    const caseStage = case_.stage?.toLowerCase() || "";
    const matchesStage = stageFilter === "all" || caseStage === stageFilter;
    
    return matchesStatus && matchesStage;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredCases.length / casesPerPage);
  const startIndex = (currentPage - 1) * casesPerPage;
  const endIndex = startIndex + casesPerPage;
  const paginatedCases = filteredCases.slice(startIndex, endIndex);

  // Reset pagination when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Reset pagination when search or filter changes
  useEffect(() => {
    resetPagination();
  }, [searchTerm, statusFilter, stageFilter]);

  const getStageBadge = (status: string, stage: string) => {
    if (status === "resolved" || status?.toLowerCase() === "closed") {
      return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Closed</Badge>;
    }
    
    // Normalize stage for consistent comparison
    const normalizedStage = stage?.toLowerCase().replace(/[_-\s]/g, '');
    
    switch (normalizedStage) {
      case "initialcontact":
      case "prelegal":
        return <Badge className="bg-blue-100 text-blue-800">Pre-Legal</Badge>;
      case "claim":
        return <Badge className="bg-yellow-100 text-yellow-800">Claim</Badge>;
      case "judgment":
      case "judgement":
        return <Badge className="bg-orange-100 text-orange-800">Judgment</Badge>;
      case "enforcement":
        return <Badge className="bg-red-100 text-red-800">Enforcement</Badge>;
      case "paymentplan":
        return <Badge className="bg-green-100 text-green-800">Payment Plan</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "legalaction":
        return <Badge className="bg-orange-100 text-orange-800">Legal Action</Badge>;
      default:
        // Display the actual stage name, formatted nicely
        const formattedStage = stage?.replace(/[_-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || 'Active';
        return <Badge className="bg-gray-100 text-gray-800">{formattedStage}</Badge>;
    }
  };

  const getDebtorIcon = (debtorType: string) => {
    const normalizedType = debtorType?.toLowerCase().replace(/[\s-]/g, '_') || '';
    switch (normalizedType) {
      case 'individual':
        return <User className="text-acclaim-teal h-5 w-5" />;
      case 'company':
        return <Building className="text-acclaim-teal h-5 w-5" />;
      case 'sole_trader':
      case 'soletrader':
        return <Store className="text-acclaim-teal h-5 w-5" />;
      case 'company_and_individual':
      case 'companyandindividual':
        return <UserCheck className="text-acclaim-teal h-5 w-5" />;
      default:
        return <User className="text-acclaim-teal h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, account, email or organisation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <Select value={statusFilter} onValueChange={setStatusFilter} disabled={!!searchTerm.trim()}>
                  <SelectTrigger className={`w-[140px] ${searchTerm.trim() ? 'opacity-50' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stage Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Stage:</label>
                <Select value={stageFilter} onValueChange={setStageFilter} disabled={!!searchTerm.trim()}>
                  <SelectTrigger className={`w-[160px] ${searchTerm.trim() ? 'opacity-50' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="pre-legal">Pre-Legal</SelectItem>
                    <SelectItem value="claim">Claim</SelectItem>
                    <SelectItem value="judgment">Judgment</SelectItem>
                    <SelectItem value="enforcement">Enforcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {searchTerm.trim() && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Searching all cases
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Cases List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {user?.isAdmin ? `All Cases - Global View` : `All Cases`}
            </CardTitle>
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCases.length)} of {filteredCases.length} cases
              {searchTerm.trim() 
                ? ` (searching all cases for "${searchTerm}")` 
                : filteredCases.length !== (cases?.length || 0) 
                  ? ` (filtered from ${cases?.length || 0})` 
                  : ''
              }
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : paginatedCases.length > 0 ? (
            <div className="space-y-4">
              {paginatedCases.map((case_: any) => (
                <div
                  key={case_.id}
                  id={`case-${case_.id}`}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(200px,1fr)_200px_120px_110px] gap-4 items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#f9fafb] flex-shrink-0">
                      {getDebtorIcon(case_.debtorType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="font-medium text-gray-900 break-words leading-tight">{case_.caseName}</p>
                        {mutedCaseIds.includes(case_.id) ? (
                          <BellOff className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-1" title="Notifications muted" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-1" title="Notifications enabled" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">Account: {case_.accountNumber}</p>
                      {case_.organisationName && (
                        <p className="text-sm text-blue-600 font-medium truncate">
                          <Building className="inline w-3 h-3 mr-1" />
                          {case_.organisationName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-center">
                    <p className="text-sm text-gray-600">Outstanding Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(case_.outstandingAmount)}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">*May include interest and costs</p>
                  </div>
                  
                  <div className="flex justify-start sm:justify-center">
                    {getStageBadge(case_.status, case_.stage)}
                  </div>
                  
                  <Dialog open={dialogOpen && selectedCase?.id === case_.id} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCase(case_);
                          setDialogOpen(true);
                        }}
                        className="flex-shrink-0 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap justify-self-end"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="sm:hidden">View</span>
                        <span className="hidden sm:inline">View Details</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
                      <DialogHeader>
                        <DialogTitle>Case Details - {case_.caseName}</DialogTitle>
                        <DialogDescription>
                          View comprehensive case information including timeline, documents, and messages.
                        </DialogDescription>
                      </DialogHeader>
                      <CaseDetail case={case_} />
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm.trim() 
                  ? `No cases found matching "${searchTerm}" (searched across all cases)`
                  : stageFilter !== "all"
                    ? `No ${statusFilter !== "all" ? statusFilter + " " : ""}cases found in ${stageFilter} stage`
                    : statusFilter !== "all" 
                      ? `No ${statusFilter} cases found`
                      : "No cases found"
                }
              </p>
              {(searchTerm.trim() || statusFilter !== "active" || stageFilter !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("active");
                    setStageFilter("all");
                    resetPagination();
                  }}
                >
                  {searchTerm.trim() ? "Clear Search" : "Reset Filters"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCases.length)} of {filteredCases.length} cases
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={currentPage === pageNumber 
                        ? "bg-acclaim-teal hover:bg-acclaim-teal/90 text-white" 
                        : "text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
                      }
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="text-acclaim-teal border-acclaim-teal hover:bg-acclaim-teal hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
