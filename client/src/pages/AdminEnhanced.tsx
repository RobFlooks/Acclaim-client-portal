import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Users, Building, Plus, Edit, Trash2, Shield, Key, Copy, UserPlus, AlertTriangle, ShieldCheck, ShieldAlert, ArrowLeft, Activity, FileText, CreditCard, Archive, ArchiveRestore, Download, Check, Eye, EyeOff, Mail, Bell, BellOff, FilePlus, FileX, BarChart3, Search, Crown, Calendar, CalendarOff, Pencil, LogOut, RefreshCw, ChevronDown, ChevronUp, Clock, Send, History } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createUserSchema, updateUserSchema, createOrganisationSchema, updateOrganisationSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";
import ApiGuideDownload from "@/components/ApiGuideDownload";
import UserGuideDownload from "@/components/UserGuideDownload";
import UserGuideWordDownload from "@/components/UserGuideWordDownload";
import CaseManagementGuideDownload from "@/components/CaseManagementGuideDownload";
import ClosedCaseManagement from "@/components/ClosedCaseManagement";
import { EmailBroadcast } from "@/components/EmailBroadcast";

// Documents List Component
function DocumentsList({ submissionId }: { submissionId: number }) {
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['/api/admin/case-submissions', submissionId, 'documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/case-submissions/${submissionId}/documents`);
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading documents...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Error loading documents</div>;
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-4">
        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No documents uploaded with this submission</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {documents.map((doc: any) => (
        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-sm">{doc.fileName}</p>
              <p className="text-xs text-gray-500">
                {formatFileSize(doc.fileSize)} • {doc.fileType} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.open(`/api/admin/case-submissions/documents/${doc.id}`, '_blank');
            }}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}

// Documents Cell Component for table display
function DocumentsCell({ submissionId }: { submissionId: number }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/admin/case-submissions', submissionId, 'documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/case-submissions/${submissionId}/documents`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="text-sm">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  const documentCount = documents?.length || 0;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1">
        <FileText className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-500">
          {documentCount} {documentCount === 1 ? 'document' : 'documents'}
        </span>
      </div>
      {documentCount > 0 && (
        <div className="text-xs text-blue-500 mt-1">
          View in details
        </div>
      )}
    </div>
  );
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organisationId: number | null;
  organisationName?: string;
  createdAt: string;
  isAdmin?: boolean;
  phone?: string;
}

interface Organisation {
  id: number;
  name: string;
  createdAt: string;
  userCount: number;
  externalRef?: string;
  scheduledReportsEnabled?: boolean;
}

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;
type CreateOrganisationForm = z.infer<typeof createOrganisationSchema>;
type UpdateOrganisationForm = z.infer<typeof updateOrganisationSchema>;

interface Case {
  id: number;
  accountNumber: string;
  caseName: string;
  debtorEmail: string;
  debtorPhone: string;
  originalAmount: string;
  outstandingAmount: string;
  status: string;
  stage: string;
  organisationId: number;
  organisationName?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface CaseSubmission {
  id: number;
  submittedBy: string;
  
  // Client details (person who submitted)
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  
  // Case identification
  caseName: string;
  
  // Debtor type and details
  debtorType: string;
  
  // Individual/Sole Trader specific fields
  individualType?: string;
  tradingName?: string;
  
  // Organisation specific fields
  organisationName?: string;
  organisationTradingName?: string;
  companyNumber?: string;
  
  // Principal of Business details (for Individual/Sole Trader)
  principalSalutation?: string;
  principalFirstName?: string;
  principalLastName?: string;
  
  // Address details
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  
  // Contact details
  mainPhone?: string;
  altPhone?: string;
  mainEmail?: string;
  altEmail?: string;
  
  // Debt details
  debtDetails?: string;
  totalDebtAmount?: number;
  currency?: string;
  
  // Payment terms
  paymentTermsType?: string;
  paymentTermsDays?: number;
  paymentTermsOther?: string;
  
  // Invoice details
  singleInvoice?: string;
  firstOverdueDate?: string;
  lastOverdueDate?: string;
  
  // Additional information
  additionalInfo?: string;
  
  // System fields
  status: string;
  organisationId: number;
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
}

const ITEMS_PER_PAGE = 20;

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="px-2 text-sm">{currentPage}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </Button>
      </div>
    </div>
  );
}

function CaseManagementTab({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmCase, setDeleteConfirmCase] = useState<Case | null>(null);
  const [archiveConfirmCase, setArchiveConfirmCase] = useState<Case | null>(null);
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [caseSearchFilter, setCaseSearchFilter] = useState("");
  const [restrictAccessCase, setRestrictAccessCase] = useState<Case | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [newCaseForm, setNewCaseForm] = useState({
    accountNumber: '',
    caseName: '',
    debtorEmail: '',
    debtorPhone: '',
    debtorAddress: '',
    debtorType: 'individual',
    originalAmount: '',
    outstandingAmount: '',
    status: 'new',
    stage: 'initial_contact',
    organisationId: '',
    externalRef: ''
  });

  // CSV Export functionality
  const exportCasesToCSV = () => {
    if (!cases || cases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to export.",
        variant: "destructive",
      });
      return;
    }

    // Define CSV headers
    const headers = [
      'Account Number',
      'Case Name',
      'Debtor Email',
      'Debtor Phone',
      'Original Amount',
      'Outstanding Amount',
      'Status',
      'Stage',
      'Organisation',
      'Created Date',
      'Updated Date',
      'Archived',
      'Archived Date'
    ];

    // Convert cases to CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...cases.map((case_: Case) => [
        `"${case_.accountNumber || ''}"`,
        `"${case_.caseName || ''}"`,
        `"${case_.debtorEmail || ''}"`,
        `"${case_.debtorPhone || ''}"`,
        `"${case_.originalAmount || ''}"`,
        `"${case_.outstandingAmount || ''}"`,
        `"${case_.status || ''}"`,
        `"${case_.stage || ''}"`,
        `"${case_.organisationName || ''}"`,
        `"${new Date(case_.createdAt).toLocaleDateString('en-GB')}"`,
        `"${new Date(case_.updatedAt).toLocaleDateString('en-GB')}"`,
        `"${case_.isArchived ? 'Yes' : 'No'}"`,
        `"${case_.archivedAt ? new Date(case_.archivedAt).toLocaleDateString('en-GB') : ''}"`
      ].join(','))
    ];

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cases-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Successfully exported ${cases.length} cases to CSV.`,
    });
  };
  
  // Fetch all cases (including archived ones for admin)
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/cases/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/cases/all');
      const data = await response.json();
      return data;
    },
    retry: false,
  });

  // Fetch organisations for the new case form
  const { data: organisations = [] } = useQuery({
    queryKey: ['/api/admin/organisations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/organisations');
      return await response.json();
    },
    retry: false,
  });

  // Fetch users for access restrictions when a case is selected
  const { data: orgUsers = [] } = useQuery({
    queryKey: ['/api/admin/organisations', restrictAccessCase?.organisationId, 'users'],
    queryFn: async () => {
      if (!restrictAccessCase?.organisationId) return [];
      const response = await apiRequest('GET', `/api/admin/organisations/${restrictAccessCase.organisationId}/users`);
      return await response.json();
    },
    enabled: !!restrictAccessCase?.organisationId,
    retry: false,
  });

  // Fetch current access restrictions for selected case
  const { data: currentRestrictions } = useQuery({
    queryKey: ['/api/admin/cases', restrictAccessCase?.id, 'access-restrictions'],
    queryFn: async () => {
      if (!restrictAccessCase?.id) return { blockedUserIds: [] };
      const response = await apiRequest('GET', `/api/admin/cases/${restrictAccessCase.id}/access-restrictions`);
      return await response.json();
    },
    enabled: !!restrictAccessCase?.id,
    retry: false,
  });

  // Update blocked user IDs when restrictions are fetched
  useEffect(() => {
    if (currentRestrictions?.blockedUserIds) {
      setBlockedUserIds(currentRestrictions.blockedUserIds);
    }
  }, [currentRestrictions]);

  // Mutation to update access restrictions
  const updateAccessRestrictionsMutation = useMutation({
    mutationFn: async ({ caseId, blockedUserIds }: { caseId: number; blockedUserIds: string[] }) => {
      return await apiRequest('POST', `/api/admin/cases/${caseId}/access-restrictions`, { blockedUserIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases', variables.caseId, 'access-restrictions'] });
      toast({
        title: "Access Updated",
        description: "Case visibility restrictions have been updated.",
      });
      setRestrictAccessCase(null);
      setBlockedUserIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update access restrictions.",
        variant: "destructive",
      });
    },
  });

  // Create new case mutation
  const createCaseMutation = useMutation({
    mutationFn: async (caseData: any) => {
      const response = await apiRequest('POST', '/api/external/cases', caseData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Case Created",
        description: "New case has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
      setShowNewCaseDialog(false);
      setNewCaseForm({
        accountNumber: '',
        caseName: '',
        debtorEmail: '',
        debtorPhone: '',
        debtorAddress: '',
        debtorType: 'individual',
        originalAmount: '',
        outstandingAmount: '',
        status: 'new',
        stage: 'initial_contact',
        organisationId: '',
        externalRef: ''
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitNewCase = () => {
    if (!newCaseForm.accountNumber || !newCaseForm.caseName || !newCaseForm.organisationId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Account Number, Case Name, Organisation).",
        variant: "destructive",
      });
      return;
    }

    const organisation = organisations.find((org: Organisation) => org.id === parseInt(newCaseForm.organisationId));
    if (!organisation) {
      toast({
        title: "Invalid Organisation",
        description: "Please select a valid organisation.",
        variant: "destructive",
      });
      return;
    }

    const caseData = {
      ...newCaseForm,
      organisationExternalRef: organisation.externalRef || organisation.name,
      assignedTo: 'Admin',
      externalRef: newCaseForm.externalRef || `ADMIN-${Date.now()}`
    };

    createCaseMutation.mutate(caseData);
  };

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Archive case mutation
  const archiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Archived",
        description: "Case has been successfully archived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
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
        description: "Failed to archive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unarchive case mutation
  const unarchiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/unarchive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Unarchived",
        description: "Case has been successfully unarchived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
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
        description: "Failed to unarchive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('DELETE', `/api/admin/cases/${caseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Case Deleted",
        description: "Case and all associated data have been permanently deleted.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
    onError: (error: any) => {
      const isForbidden = error?.message?.includes('403') || error?.message?.includes('Super admin');
      if (isForbidden) {
        toast({
          title: "Access Denied",
          description: "Only super admins can delete cases. Please contact a super admin to perform this action.",
          variant: "destructive",
        });
        return;
      }
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
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter cases by search term
  const filteredCases = caseSearchFilter.trim()
    ? cases.filter((case_: Case) => {
        const search = caseSearchFilter.toLowerCase();
        return (
          case_.accountNumber?.toLowerCase().includes(search) ||
          case_.caseName?.toLowerCase().includes(search) ||
          case_.debtorEmail?.toLowerCase().includes(search) ||
          case_.organisationName?.toLowerCase().includes(search) ||
          case_.status?.toLowerCase().includes(search) ||
          case_.stage?.toLowerCase().includes(search) ||
          String(case_.id).includes(search)
        );
      })
    : cases;

  // Pagination logic for cases
  const totalPages = Math.ceil((filteredCases?.length || 0) / ITEMS_PER_PAGE);
  const paginatedCases = filteredCases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) {
    return <div>Loading cases...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading cases: {error.message}</p>
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by account, name, email, or organisation..."
            value={caseSearchFilter}
            onChange={(e) => {
              setCaseSearchFilter(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewCaseDialog(true)}
            variant="default"
            size="sm"
            className="gap-2"
            title="Create a new case directly"
          >
            <Plus className="h-4 w-4" />
            Submit New Case
          </Button>
          <Button
            onClick={exportCasesToCSV}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Export all cases to CSV file"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 px-1">
          Total Cases: {cases.length} | Archived: {cases.filter((c: Case) => c.isArchived).length} | Active: {cases.filter((c: Case) => !c.isArchived).length} | Showing: {paginatedCases.length}
          {caseSearchFilter && ` (filtered from ${cases.length})`}
        </div>
      </div>
      
      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-4">
        {paginatedCases.map((case_: Case) => (
          <div key={case_.id} className={`rounded-lg p-4 space-y-3 ${case_.isArchived ? 'bg-gray-50 border' : 'border'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{case_.accountNumber}</div>
                <div className="text-sm text-gray-700">{case_.caseName}</div>
                <div className="text-xs text-gray-500">{case_.organisationName || 'N/A'}</div>
              </div>
              <div className="flex flex-col gap-1">
                {case_.isArchived ? (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant={case_.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {case_.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stage:</span>
                <Badge variant="outline" className="text-xs">{case_.stage}</Badge>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-600">Outstanding:</span>
                <span className="font-medium">£{case_.outstandingAmount}</span>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              {case_.isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => unarchiveCaseMutation.mutate(case_.id)}
                  disabled={unarchiveCaseMutation.isPending}
                >
                  <ArchiveRestore className="h-3 w-3 mr-1" />
                  Unarchive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setArchiveConfirmCase(case_)}
                  disabled={archiveCaseMutation.isPending}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestrictAccessCase(case_);
                  setBlockedUserIds([]);
                }}
                title="Restrict access"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmCase(case_)}
                  disabled={deleteCaseMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Number</TableHead>
              <TableHead>Case Name</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCases.map((case_: Case) => (
              <TableRow key={case_.id} className={case_.isArchived ? 'bg-gray-50' : ''}>
                <TableCell className="font-medium">{case_.accountNumber}</TableCell>
                <TableCell>{case_.caseName}</TableCell>
                <TableCell>{case_.organisationName || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={case_.status === 'active' ? 'default' : 'secondary'}>
                    {case_.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{case_.stage}</Badge>
                </TableCell>
                <TableCell>£{case_.outstandingAmount}</TableCell>
                <TableCell>
                  {case_.isArchived ? (
                    <Badge variant="secondary">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {case_.isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveCaseMutation.mutate(case_.id)}
                        disabled={unarchiveCaseMutation.isPending}
                        title="Unarchive case"
                      >
                        <ArchiveRestore className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setArchiveConfirmCase(case_)}
                        disabled={archiveCaseMutation.isPending}
                        title="Archive case"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRestrictAccessCase(case_);
                        setBlockedUserIds([]);
                      }}
                      title="Restrict access for specific users"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmCase(case_)}
                        disabled={deleteCaseMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        title="Permanently delete case"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmCase} onOpenChange={() => setDeleteConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanent Deletion Warning
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to permanently delete case "{deleteConfirmCase?.caseName}"?
              </p>
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <p className="text-sm text-red-800 font-medium">⚠️ This action cannot be undone!</p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside space-y-1">
                  <li>The case and all its details</li>
                  <li>All messages related to this case</li>
                  <li>All documents attached to this case</li>
                  <li>All payment records for this case</li>
                  <li>All activity history for this case</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Consider archiving the case instead if you want to hide it while preserving the data.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCase(null)}
              disabled={deleteCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmCase) {
                  deleteCaseMutation.mutate(deleteConfirmCase.id);
                  setDeleteConfirmCase(null);
                }
              }}
              disabled={deleteCaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCaseMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!archiveConfirmCase} onOpenChange={() => setArchiveConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              Archive Case
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to archive case "{archiveConfirmCase?.caseName}"?
              </p>
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                <p className="text-sm text-orange-800 font-medium">📦 Archiving will:</p>
                <ul className="text-sm text-orange-700 mt-1 list-disc list-inside space-y-1">
                  <li>Hide the case from normal operations</li>
                  <li>Preserve all data (messages, documents, payments)</li>
                  <li>Allow you to restore it later if needed</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This is a safe operation that can be reversed by unarchiving the case.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setArchiveConfirmCase(null)}
              disabled={archiveCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (archiveConfirmCase) {
                  archiveCaseMutation.mutate(archiveConfirmCase.id);
                  setArchiveConfirmCase(null);
                }
              }}
              disabled={archiveCaseMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {archiveCaseMutation.isPending ? "Archiving..." : "Archive Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Case Dialog */}
      <Dialog open={showNewCaseDialog} onOpenChange={setShowNewCaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Submit New Case
            </DialogTitle>
            <DialogDescription>
              Create a new case that can be exported to CSV for upload to your external case management system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={newCaseForm.accountNumber}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, accountNumber: e.target.value })}
                placeholder="e.g., ACC-001"
              />
            </div>
            <div>
              <Label htmlFor="caseName">Case Name *</Label>
              <Input
                id="caseName"
                value={newCaseForm.caseName}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, caseName: e.target.value })}
                placeholder="e.g., John Smith vs ABC Ltd"
              />
            </div>
            <div>
              <Label htmlFor="debtorEmail">Debtor Email</Label>
              <Input
                id="debtorEmail"
                type="email"
                value={newCaseForm.debtorEmail}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorEmail: e.target.value })}
                placeholder="debtor@example.com"
              />
            </div>
            <div>
              <Label htmlFor="debtorPhone">Debtor Phone</Label>
              <Input
                id="debtorPhone"
                value={newCaseForm.debtorPhone}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorPhone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="debtorAddress">Debtor Address</Label>
              <Input
                id="debtorAddress"
                value={newCaseForm.debtorAddress}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorAddress: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div>
              <Label htmlFor="debtorType">Debtor Type</Label>
              <Select value={newCaseForm.debtorType} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, debtorType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organisationId">Organisation *</Label>
              <Select value={newCaseForm.organisationId} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, organisationId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org: Organisation) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="originalAmount">Original Amount (£)</Label>
              <Input
                id="originalAmount"
                type="number"
                step="0.01"
                value={newCaseForm.originalAmount}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, originalAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="outstandingAmount">Outstanding Amount (£)</Label>
              <Input
                id="outstandingAmount"
                type="number"
                step="0.01"
                value={newCaseForm.outstandingAmount}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, outstandingAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newCaseForm.status} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Select value={newCaseForm.stage} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_contact">Initial Contact</SelectItem>
                  <SelectItem value="investigation">Investigation</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="legal_action">Legal Action</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="externalRef">External Reference</Label>
              <Input
                id="externalRef"
                value={newCaseForm.externalRef}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, externalRef: e.target.value })}
                placeholder="Leave blank for auto-generation"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowNewCaseDialog(false)} disabled={createCaseMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmitNewCase} disabled={createCaseMutation.isPending}>
              {createCaseMutation.isPending ? "Creating..." : "Create Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restrict Access Dialog */}
      <Dialog open={!!restrictAccessCase} onOpenChange={() => { setRestrictAccessCase(null); setBlockedUserIds([]); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Restrict Case Access
            </DialogTitle>
            <DialogDescription>
              Hide this case from specific users in the organisation. Blocked users will not see this case in their case list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Case: {restrictAccessCase?.caseName}</p>
            <p className="text-xs text-gray-500 mb-4">Organisation: {restrictAccessCase?.organisationName}</p>
            
            {orgUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No users found for this organisation.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-2">Select users to hide this case from:</p>
                {orgUsers.filter((u: any) => !u.isAdmin).map((user: any) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50">
                    <Checkbox
                      id={`block-${user.id}`}
                      checked={blockedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBlockedUserIds([...blockedUserIds, user.id]);
                        } else {
                          setBlockedUserIds(blockedUserIds.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <label htmlFor={`block-${user.id}`} className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            {blockedUserIds.length > 0 && (
              <p className="text-sm text-amber-600 mt-3">
                {blockedUserIds.length} user{blockedUserIds.length > 1 ? 's' : ''} will be blocked from viewing this case.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRestrictAccessCase(null); setBlockedUserIds([]); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (restrictAccessCase) {
                  updateAccessRestrictionsMutation.mutate({ 
                    caseId: restrictAccessCase.id, 
                    blockedUserIds 
                  });
                }
              }}
              disabled={updateAccessRestrictionsMutation.isPending}
            >
              {updateAccessRestrictionsMutation.isPending ? "Saving..." : "Save Restrictions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseSubmissionsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<CaseSubmission | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch case submissions
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: selectedStatus === "all" ? ["/api/admin/case-submissions"] : ["/api/admin/case-submissions", selectedStatus],
    queryFn: async () => {
      const endpoint = selectedStatus === "all" 
        ? "/api/admin/case-submissions" 
        : `/api/admin/case-submissions/${selectedStatus}`;
      const response = await apiRequest("GET", endpoint);
      return await response.json();
    },
    retry: false,
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/case-submissions/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-submissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status",
        variant: "destructive",
      });
    },
  });

  // Delete submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/case-submissions/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-submissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
    },
  });

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedSubmissions(new Set(submissions.map((s: CaseSubmission) => s.id)));
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  // Handle individual row selection
  const handleRowSelect = (submissionId: number, checked: boolean) => {
    const newSelected = new Set(selectedSubmissions);
    if (checked) {
      newSelected.add(submissionId);
    } else {
      newSelected.delete(submissionId);
    }
    setSelectedSubmissions(newSelected);
    setSelectAll(newSelected.size === submissions.length);
  };

  // CSV Export functionality for submissions
  const exportSubmissionsToCSV = () => {
    const submissionsToExport = selectedSubmissions.size > 0 
      ? submissions.filter((s: CaseSubmission) => selectedSubmissions.has(s.id))
      : submissions;

    if (!submissionsToExport || submissionsToExport.length === 0) {
      toast({
        title: "No Data",
        description: selectedSubmissions.size > 0 
          ? "No case submissions selected for export." 
          : "No case submissions available to export.",
        variant: "destructive",
      });
      return;
    }

    // Define comprehensive CSV headers to capture all form data
    const headers = [
      'Submission ID',
      'Case Name',
      'Client Name',
      'Client Email', 
      'Client Phone',
      'Debtor Type',
      'Individual Type',
      'Trading Name',
      'Organisation Name',
      'Organisation Trading Name',
      'Company Number',
      'Principal Salutation',
      'Principal First Name',
      'Principal Last Name',
      'Address Line 1',
      'Address Line 2',
      'City',
      'County',
      'Postcode',
      'Main Phone',
      'Alt Phone',
      'Main Email',
      'Alt Email',
      'Debt Details',
      'Total Debt Amount',
      'Currency',
      'Payment Terms Type',
      'Payment Terms Days',
      'Payment Terms Other',
      'Single Invoice',
      'First Overdue Date',
      'Last Overdue Date',
      'Additional Info',
      'Organisation ID',
      'Status',
      'Submitted By',
      'Submitted Date',
      'Processed By',
      'Processed Date'
    ];

    // Convert submissions to CSV rows using actual database fields
    const csvRows = [
      headers.join(','), // Header row
      ...submissionsToExport.map((submission: CaseSubmission) => {
        return [
          `"${submission.id || ''}"`,
          `"${submission.caseName || ''}"`,
          `"${submission.clientName || ''}"`,
          `"${submission.clientEmail || ''}"`,
          `"${submission.clientPhone || ''}"`,
          `"${submission.debtorType || ''}"`,
          `"${submission.individualType || ''}"`,
          `"${submission.tradingName || ''}"`,
          `"${submission.organisationName || ''}"`,
          `"${submission.organisationTradingName || ''}"`,
          `"${submission.companyNumber || ''}"`,
          `"${submission.principalSalutation || ''}"`,
          `"${submission.principalFirstName || ''}"`,
          `"${submission.principalLastName || ''}"`,
          `"${submission.addressLine1 || ''}"`,
          `"${submission.addressLine2 || ''}"`,
          `"${submission.city || ''}"`,
          `"${submission.county || ''}"`,
          `"${submission.postcode || ''}"`,
          `"${submission.mainPhone || ''}"`,
          `"${submission.altPhone || ''}"`,
          `"${submission.mainEmail || ''}"`,
          `"${submission.altEmail || ''}"`,
          `"${submission.debtDetails || ''}"`,
          `"${submission.totalDebtAmount || ''}"`,
          `"${submission.currency || 'GBP'}"`,
          `"${submission.paymentTermsType || ''}"`,
          `"${submission.paymentTermsDays || ''}"`,
          `"${submission.paymentTermsOther || ''}"`,
          `"${submission.singleInvoice || ''}"`,
          `"${submission.firstOverdueDate || ''}"`,
          `"${submission.lastOverdueDate || ''}"`,
          `"${submission.additionalInfo || ''}"`,
          `"${submission.organisationId || ''}"`,
          `"${submission.status || ''}"`,
          `"${submission.submittedBy || ''}"`,
          `"${submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('en-GB') : ''}"`,
          `"${submission.processedBy || ''}"`,
          `"${submission.processedAt ? new Date(submission.processedAt).toLocaleDateString('en-GB') : ''}"`
        ].join(',');
      })
    ];

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `case-submissions-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Successfully exported ${submissionsToExport.length} case submission${submissionsToExport.length === 1 ? '' : 's'} to CSV.`,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  // Pagination logic for submissions
  const totalPages = Math.ceil((submissions?.length || 0) / ITEMS_PER_PAGE);
  const paginatedSubmissions = submissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) return <div>Loading case submissions...</div>;
  if (error) return <div>Error loading case submissions</div>;

  return (
    <div className="space-y-4">
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-sm">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </Badge>
          {selectedSubmissions.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedSubmissions.size} selected
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedSubmissions(new Set());
                  setSelectAll(false);
                }}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        <Button 
          onClick={exportSubmissionsToCSV} 
          variant="outline" 
          size="sm"
          title={selectedSubmissions.size > 0 
            ? `Export ${selectedSubmissions.size} selected submissions to CSV`
            : 'Export all submissions to CSV file'
          }
        >
          <Download className="h-4 w-4 mr-2" />
          {selectedSubmissions.size > 0 
            ? `Export Selected (${selectedSubmissions.size})`
            : 'Export All'
          }
        </Button>
      </div>

      {/* Submissions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Case Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Debtor Type</TableHead>
              <TableHead>Debtor Details</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Debt Amount</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-500">No case submissions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSubmissions.map((submission: CaseSubmission) => (
                <TableRow key={submission.id}>
                  <TableCell className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.has(submission.id)}
                      onChange={(e) => handleRowSelect(submission.id, e.target.checked)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-[150px]">
                      <div className="font-medium truncate">{submission.caseName}</div>
                      <div className="text-xs text-gray-500">ID: {submission.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="font-medium truncate">{submission.clientName}</div>
                      <div className="text-gray-500 truncate">{submission.clientEmail}</div>
                      {submission.clientPhone && <div className="text-gray-500 truncate">{submission.clientPhone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="font-medium truncate">{(submission as any).organisationName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">ID: {submission.organisationId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {submission.debtorType === 'individual' ? 'Individual' : 'Organisation'}
                      </Badge>
                      {submission.individualType && (
                        <div className="text-xs text-gray-500 mt-1">{submission.individualType}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[150px]">
                      {submission.debtorType === 'organisation' ? (
                        <div>
                          <div className="font-medium truncate">{submission.organisationName}</div>
                          {submission.organisationTradingName && (
                            <div className="text-gray-500 truncate">Trading: {submission.organisationTradingName}</div>
                          )}
                          {submission.companyNumber && (
                            <div className="text-gray-500 truncate">Co: {submission.companyNumber}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {submission.tradingName ? (
                            <div className="font-medium truncate">{submission.tradingName}</div>
                          ) : (
                            <div className="font-medium truncate">
                              {submission.principalSalutation} {submission.principalFirstName} {submission.principalLastName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="truncate">{submission.addressLine1}</div>
                      {submission.addressLine2 && <div className="truncate text-gray-500">{submission.addressLine2}</div>}
                      <div className="truncate">{submission.city}, {submission.county}</div>
                      <div className="truncate font-medium">{submission.postcode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      {submission.mainPhone && <div className="truncate">{submission.mainPhone}</div>}
                      {submission.altPhone && <div className="truncate text-gray-500">{submission.altPhone}</div>}
                      {submission.mainEmail && <div className="truncate">{submission.mainEmail}</div>}
                      {submission.altEmail && <div className="truncate text-gray-500">{submission.altEmail}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">£{submission.totalDebtAmount?.toLocaleString()}</div>
                      <div className="text-gray-500">{submission.currency || 'GBP'}</div>
                      {submission.singleInvoice && (
                        <div className="text-xs text-gray-500">Single: {submission.singleInvoice}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[100px]">
                      {submission.paymentTermsType && (
                        <div className="truncate">
                          {submission.paymentTermsDays && `${submission.paymentTermsDays} days`}
                          {submission.paymentTermsType === 'days_from_invoice' && ' from invoice'}
                          {submission.paymentTermsType === 'days_from_month_end' && ' from month end'}
                          {submission.paymentTermsType === 'other' && submission.paymentTermsOther}
                        </div>
                      )}
                      {submission.firstOverdueDate && (
                        <div className="text-xs text-gray-500">First: {submission.firstOverdueDate}</div>
                      )}
                      {submission.lastOverdueDate && (
                        <div className="text-xs text-gray-500">Last: {submission.lastOverdueDate}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DocumentsCell submissionId={submission.id} />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(submission.submittedAt).toLocaleDateString('en-GB')}</div>
                      <div className="text-gray-500">by {submission.submittedBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowDetailsDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="View submission details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {submission.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'processed' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                            title="Mark as processed"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'rejected' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="Reject submission"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this submission?')) {
                              deleteSubmissionMutation.mutate(submission.id);
                            }
                          }}
                          disabled={deleteSubmissionMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                          title="Delete submission permanently"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />

      {/* Comprehensive Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Case Submission Details
            </DialogTitle>
            <DialogDescription>
              Complete information from the comprehensive case submission form
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Account Number</Label>
                    <p className="text-sm">{selectedSubmission.accountNumber}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Case Name</Label>
                    <p className="text-sm">{selectedSubmission.caseName}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedSubmission.status)}>
                      {selectedSubmission.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Organisation</Label>
                    <p className="text-sm">{selectedSubmission.organisationName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Form Data */}
              {selectedSubmission.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehensive Form Data</CardTitle>
                    <CardDescription>All details captured from the submission form</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedSubmission.notes.split('\n').map((line, index) => {
                        if (!line.trim() || !line.includes(':')) return null;
                        const [label, ...valueParts] = line.split(':');
                        const value = valueParts.join(':').trim();
                        
                        return (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-2">
                            <Label className="font-semibold text-sm">{label.trim()}</Label>
                            <p className="text-sm md:col-span-2">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact and Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact & Address</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Debtor Email</Label>
                    <p className="text-sm">{selectedSubmission.debtorEmail || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Debtor Phone</Label>
                    <p className="text-sm">{selectedSubmission.debtorPhone || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-semibold">Debtor Address</Label>
                    <p className="text-sm">{selectedSubmission.debtorAddress || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Original Amount</Label>
                    <p className="text-sm">{formatCurrency(selectedSubmission.originalAmount)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Outstanding Amount</Label>
                    <p className="text-sm">{formatCurrency(selectedSubmission.outstandingAmount)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Debtor Type</Label>
                    <p className="text-sm">{selectedSubmission.debtorType}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Stage</Label>
                    <p className="text-sm">{selectedSubmission.stage}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Supporting Documents
                  </CardTitle>
                  <CardDescription>Files uploaded with this case submission</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentsList submissionId={selectedSubmission.id} />
                </CardContent>
              </Card>

              {/* Submission Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Submitted By</Label>
                    <p className="text-sm">{selectedSubmission.submittedBy}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Submitted Date</Label>
                    <p className="text-sm">{new Date(selectedSubmission.submittedAt).toLocaleDateString('en-GB')}</p>
                  </div>
                  {selectedSubmission.processedBy && (
                    <>
                      <div>
                        <Label className="font-semibold">Processed By</Label>
                        <p className="text-sm">{selectedSubmission.processedBy}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Processed Date</Label>
                        <p className="text-sm">{selectedSubmission.processedAt ? new Date(selectedSubmission.processedAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {selectedSubmission.externalRef && (
                    <div className="md:col-span-2">
                      <Label className="font-semibold">External Reference</Label>
                      <p className="text-sm">{selectedSubmission.externalRef}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                {selectedSubmission.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'processed' });
                        setShowDetailsDialog(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Processed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'rejected' });
                        setShowDetailsDialog(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminEnhanced() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if current user is super admin for destructive operations
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  
  // State for organisation management
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgExternalRef, setNewOrgExternalRef] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("none");
  const [orgAssignSearch, setOrgAssignSearch] = useState("");
  const [orgAssignPopoverOpen, setOrgAssignPopoverOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [orgFormData, setOrgFormData] = useState<CreateOrganisationForm>({
    name: "",
    externalRef: "",
  });
  
  // Org-level scheduled report state
  const [showOrgScheduleDialog, setShowOrgScheduleDialog] = useState(false);
  const [selectedOrgForSchedule, setSelectedOrgForSchedule] = useState<Organisation | null>(null);
  
  // Scheduled reports overview state
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
  const [orgScheduleForm, setOrgScheduleForm] = useState({
    recipientEmail: '',
    recipientName: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: 9,
    includeCaseSummary: true,
    includeActivityReport: true,
    caseStatusFilter: 'active' as 'active' | 'all' | 'closed',
    enabled: true,
  });
  
  // State for viewing/managing org scheduled reports
  const [showOrgReportsDialog, setShowOrgReportsDialog] = useState(false);
  const [selectedOrgForReports, setSelectedOrgForReports] = useState<Organisation | null>(null);
  const [editingOrgReport, setEditingOrgReport] = useState<any | null>(null);
  const [showEditOrgReportForm, setShowEditOrgReportForm] = useState(false);
  const [editingFromReportsTab, setEditingFromReportsTab] = useState(false);
  
  // State for viewing report audit logs
  const [showReportAuditDialog, setShowReportAuditDialog] = useState(false);
  const [selectedReportForAudit, setSelectedReportForAudit] = useState<any | null>(null);
  
  // State for closed case management
  const [showClosedCaseManagement, setShowClosedCaseManagement] = useState(false);

  // State for user management
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<CreateUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organisationId: undefined,
    isAdmin: false,
  });
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false); // true = new user, false = password reset
  const [showConfirmCreateUser, setShowConfirmCreateUser] = useState(false);
  const [orgSearchTerm, setOrgSearchTerm] = useState("");

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [orgsPage, setOrgsPage] = useState(1);
  
  // Search filter state
  const [userSearchFilter, setUserSearchFilter] = useState("");
  const [orgSearchFilter, setOrgSearchFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "admin" | "user" | "not_registered">("all");

  // Scheduled reports configuration dialog state
  const [showScheduledReportDialog, setShowScheduledReportDialog] = useState(false);
  const [scheduledReportUser, setScheduledReportUser] = useState<User | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null); // null = creating new
  const [scheduledReportOrgId, setScheduledReportOrgId] = useState<number | null>(null); // null = combined report
  const [scheduledReportEnabled, setScheduledReportEnabled] = useState(false);
  const [scheduledReportFrequency, setScheduledReportFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduledReportDayOfWeek, setScheduledReportDayOfWeek] = useState(1);
  const [scheduledReportDayOfMonth, setScheduledReportDayOfMonth] = useState(1);
  const [scheduledReportTimeOfDay, setScheduledReportTimeOfDay] = useState(9);
  const [scheduledReportCaseSummary, setScheduledReportCaseSummary] = useState(true);
  const [scheduledReportActivity, setScheduledReportActivity] = useState(true);
  const [scheduledReportCaseFilter, setScheduledReportCaseFilter] = useState<"active" | "all" | "closed">("active");
  const [showReportEditForm, setShowReportEditForm] = useState(false); // Show add/edit form within dialog

  // Fetch users with their organisations
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/admin/users-with-orgs"],
    retry: false,
  });

  // Fetch organisations
  const { data: organisations = [], isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["/api/admin/organisations"],
    retry: false,
  });

  // Fetch scheduled reports settings for all users
  const { data: scheduledReports = [], isFetching: scheduledReportsFetching } = useQuery<any[]>({
    queryKey: ["/api/admin/scheduled-reports"],
    retry: false,
  });

  // Create a map of userId -> array of scheduled report settings for quick lookup
  const scheduledReportsMap = scheduledReports.reduce((acc: Record<string, any[]>, report: any) => {
    if (!acc[report.userId]) {
      acc[report.userId] = [];
    }
    acc[report.userId].push(report);
    return acc;
  }, {} as Record<string, any[]>);

  // Create a map of orgId -> array of scheduled reports for quick lookup
  const orgScheduledReportsMap = scheduledReports.reduce((acc: Record<number, any[]>, report: any) => {
    if (report.organisationId) {
      if (!acc[report.organisationId]) {
        acc[report.organisationId] = [];
      }
      acc[report.organisationId].push(report);
    }
    return acc;
  }, {} as Record<number, any[]>);

  // Fetch scheduled reports for selected organisation
  const { data: selectedOrgReports = [], isLoading: orgReportsLoading, refetch: refetchOrgReports } = useQuery<any[]>({
    queryKey: ["/api/admin/organisations", selectedOrgForReports?.id, "scheduled-reports"],
    queryFn: async () => {
      if (!selectedOrgForReports?.id) return [];
      const response = await apiRequest("GET", `/api/admin/organisations/${selectedOrgForReports.id}/scheduled-reports`);
      return response.json();
    },
    enabled: !!selectedOrgForReports?.id,
  });

  // Fetch audit logs for selected report
  const { data: reportAuditLogs = [], isLoading: reportAuditLogsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/scheduled-reports", selectedReportForAudit?.id, "audit-logs"],
    queryFn: async () => {
      if (!selectedReportForAudit?.id) return [];
      const response = await apiRequest("GET", `/api/admin/scheduled-reports/${selectedReportForAudit.id}/audit-logs`);
      return response.json();
    },
    enabled: !!selectedReportForAudit?.id && showReportAuditDialog,
  });

  // Create organisation mutation
  const createOrganisationMutation = useMutation({
    mutationFn: async (data: CreateOrganisationForm) => {
      const response = await apiRequest("POST", `/api/admin/organisations`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "", externalRef: "" });
      setNewOrgName("");
      setNewOrgExternalRef("");
      setShowCreateOrg(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create organisation",
        variant: "destructive",
      });
    },
  });

  // Update organisation mutation
  const updateOrganisationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateOrganisationForm }) => {
      const response = await apiRequest("PUT", `/api/admin/organisations/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "", externalRef: "" });
      setEditingOrg(null);
      setShowEditOrg(false);
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update organisation",
        variant: "destructive",
      });
    },
  });

  // Delete organisation mutation
  const deleteOrganisationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/organisations/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
    },
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
        description: error.message || "Failed to delete organisation",
        variant: "destructive",
      });
    },
  });

  // Create org-level scheduled report with custom email
  const createOrgScheduledReportMutation = useMutation({
    mutationFn: async (data: {
      organisationId: number;
      recipientEmail: string;
      recipientName: string;
      frequency: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timeOfDay: number;
      includeCaseSummary: boolean;
      includeActivityReport: boolean;
      caseStatusFilter: string;
    }) => {
      const response = await apiRequest("POST", `/api/admin/organisations/${data.organisationId}/scheduled-reports`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled report created successfully",
      });
      setShowOrgScheduleDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-reports"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create scheduled report",
        variant: "destructive",
      });
    },
  });

  // Create scheduled report mutation
  const createScheduledReportMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/scheduled-reports`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled report created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-reports"] });
      setShowReportEditForm(false);
      setEditingReportId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create scheduled report",
        variant: "destructive",
      });
    },
  });

  // Update scheduled report mutation
  const updateScheduledReportMutation = useMutation({
    mutationFn: async ({ reportId, data }: { reportId: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/scheduled-reports/${reportId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled report settings saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-reports"] });
      if (selectedOrgForReports?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations", selectedOrgForReports.id, "scheduled-reports"] });
      }
      setShowReportEditForm(false);
      setShowEditOrgReportForm(false);
      setEditingReportId(null);
      setEditingOrgReport(null);
      if (editingFromReportsTab) {
        setShowOrgReportsDialog(false);
        setShowScheduledReportDialog(false);
        setSelectedOrgForReports(null);
        setScheduledReportUser(null);
        setEditingFromReportsTab(false);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save scheduled report settings",
        variant: "destructive",
      });
    },
  });

  // Delete scheduled report mutation
  const deleteScheduledReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/scheduled-reports/${reportId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled report deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-reports"] });
      if (selectedOrgForReports?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations", selectedOrgForReports.id, "scheduled-reports"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete scheduled report",
        variant: "destructive",
      });
    },
  });

  // Send test report mutation
  const sendTestReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("POST", `/api/admin/scheduled-reports/${reportId}/test-send`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Test report sent",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send test report",
        variant: "destructive",
      });
    },
  });

  // Open scheduled report dialog to show user's reports list
  const openScheduledReportDialog = (user: User) => {
    setScheduledReportUser(user);
    setShowReportEditForm(false);
    setEditingReportId(null);
    setShowScheduledReportDialog(true);
  };

  // Open form to create a new report
  const openNewReportForm = () => {
    setEditingReportId(null);
    setScheduledReportOrgId(null);
    setScheduledReportEnabled(true);
    setScheduledReportFrequency("weekly");
    setScheduledReportDayOfWeek(1);
    setScheduledReportDayOfMonth(1);
    setScheduledReportTimeOfDay(9);
    setScheduledReportCaseSummary(true);
    setScheduledReportActivity(true);
    setScheduledReportCaseFilter("active");
    setShowReportEditForm(true);
  };

  // Open form to edit an existing report
  const openEditReportForm = (report: any) => {
    setEditingReportId(report.id);
    setScheduledReportOrgId(report.organisationId || null);
    setScheduledReportEnabled(report.enabled ?? true);
    setScheduledReportFrequency(report.frequency || "weekly");
    setScheduledReportDayOfWeek(report.dayOfWeek ?? 1);
    setScheduledReportDayOfMonth(report.dayOfMonth ?? 1);
    setScheduledReportTimeOfDay(report.timeOfDay ?? 9);
    setScheduledReportCaseSummary(report.includeCaseSummary ?? true);
    setScheduledReportActivity(report.includeActivityReport ?? true);
    setScheduledReportCaseFilter(report.caseStatusFilter || "active");
    setShowReportEditForm(true);
  };

  // Get user's organisations for the report dropdown
  const getUserOrganisations = (user: User): { id: number; name: string }[] => {
    if (!user.organisations) return [];
    return user.organisations.map((uo: any) => ({
      id: uo.organisationId || uo.id,
      name: uo.organisationName || uo.name || `Org ${uo.organisationId || uo.id}`,
    }));
  };

  // Get organisation name from the organisations list
  const getOrgName = (orgId: number): string => {
    const org = organisations.find((o: any) => o.id === orgId);
    return org?.name || `Organisation ${orgId}`;
  };

  // Assign user to organisation mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/assign`, { organisationId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned to organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setSelectedUser(null);
      setSelectedOrgId("");
      setShowAssignUser(false);
    },
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
        description: "Failed to assign user to organisation",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest("POST", `/api/admin/users`, userData);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Create user response:", data);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      setUserFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organisationId: undefined,
        isAdmin: false,
      });
      setShowCreateUser(false);
      setTempPassword(data.tempPassword || "");
      // Handle nested user structure from API: data.user.user.id or data.user.id
      const userId = data.user?.user?.id || data.user?.id || null;
      setCreatedUserId(userId);
      setIsNewUserFlow(true); // This is a new user creation
      setShowPasswordDialog(true);
    },
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
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      return await response.json();
    },
    onSuccess: (data, userId) => {
      console.log("Reset password response:", data);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setTempPassword(data.tempPassword || "");
      setCreatedUserId(userId);
      setIsNewUserFlow(false); // This is a password reset, not new user
      setShowPasswordDialog(true);
    },
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
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Multi-organisation management mutations
  const addUserToOrgMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/organisations`, { organisationId });
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "User added to organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      await queryClient.refetchQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      
      // Update selectedUser with fresh data from the cache
      if (selectedUser) {
        const freshUsers = queryClient.getQueryData<User[]>(["/api/admin/users-with-orgs"]);
        const updatedUser = freshUsers?.find(u => u.id === selectedUser.id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to organisation",
        variant: "destructive",
      });
    },
  });

  const removeUserFromOrgMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}/organisations/${organisationId}`);
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Success", 
        description: "User removed from organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      await queryClient.refetchQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      
      // Update selectedUser with fresh data from the cache
      if (selectedUser) {
        const freshUsers = queryClient.getQueryData<User[]>(["/api/admin/users-with-orgs"]);
        const updatedUser = freshUsers?.find(u => u.id === selectedUser.id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to remove user from organisation";
      if (errorMessage.includes("Cannot remove yourself from your last organisation")) {
        toast({
          title: "Cannot Remove Organisation",
          description: "You cannot remove yourself from your last organisation. Please assign yourself to another organisation first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Set user org role mutation
  const setUserOrgRoleMutation = useMutation({
    mutationFn: async ({ userId, organisationId, role }: { userId: string; organisationId: number; role: string }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/organisations/${organisationId}/role`, { role });
      return await response.json();
    },
    onSuccess: (_, variables) => {
      const roleLabel = variables.role === 'owner' ? 'Organisation Owner' : 'Member';
      toast({
        title: "Role Updated",
        description: `User is now a ${roleLabel}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const endpoint = makeAdmin ? "make-admin" : "remove-admin";
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/${endpoint}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
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
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  // Update user details mutation (super admins only for admin users, email changes require super admin)
  const updateUserNameMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName, email }: { userId: string; firstName: string; lastName: string; email?: string }) => {
      const payload: any = { firstName, lastName };
      if (email) payload.email = email;
      const response = await apiRequest("PUT", `/api/admin/users/${userId}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User name updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      setShowEditUser(false);
      setEditingUser(null);
    },
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
        description: error.message || "Failed to update user name",
        variant: "destructive",
      });
    },
  });

  // Toggle super admin status mutation (super admins only)
  const toggleSuperAdminMutation = useMutation({
    mutationFn: async ({ userId, makeSuperAdmin }: { userId: string; makeSuperAdmin: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/super-admin`, { isSuperAdmin: makeSuperAdmin });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
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
        description: error.message || "Failed to update super admin status",
        variant: "destructive",
      });
    },
  });

  // Toggle case submission permission mutation
  const toggleCaseSubmissionMutation = useMutation({
    mutationFn: async ({ userId, canSubmitCases }: { userId: string; canSubmitCases: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/case-submission`, { canSubmitCases });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
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
        description: error.message || "Failed to update case submission permission",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Deleted",
        description: data.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
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
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Send welcome email mutation
  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/send-welcome-email`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome Email Sent",
        description: data.message,
      });
    },
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
        description: error.message || "Failed to send welcome email",
        variant: "destructive",
      });
    },
  });

  // Force logout mutation (invalidate all sessions for a user)
  const forceLogoutMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/force-logout`, { reason });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Logged Out",
        description: data.message,
      });
    },
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
        description: error.message || "Failed to force logout user",
        variant: "destructive",
      });
    },
  });

  // Copy temp password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Temporary password copied to clipboard",
    });
  };

  const handleSendWelcomeEmail = async () => {
    if (!createdUserId || !tempPassword) {
      toast({
        title: "Error",
        description: "Unable to send welcome email - missing user information",
        variant: "destructive",
      });
      return;
    }

    setSendingWelcomeEmail(true);
    try {
      const response = await apiRequest("POST", `/api/admin/users/${createdUserId}/send-welcome-email`, {
        temporaryPassword: tempPassword
      });
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "Welcome emails sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome emails",
        variant: "destructive",
      });
    } finally {
      setSendingWelcomeEmail(false);
    }
  };

  const handleSendPasswordEmail = async () => {
    if (!createdUserId || !tempPassword) {
      toast({
        title: "Error",
        description: "Unable to send password email - missing user information",
        variant: "destructive",
      });
      return;
    }

    setSendingPasswordEmail(true);
    try {
      const response = await apiRequest("POST", `/api/admin/users/${createdUserId}/send-password-email`, {
        temporaryPassword: tempPassword
      });
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "Password email sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password email",
        variant: "destructive",
      });
    } finally {
      setSendingPasswordEmail(false);
    }
  };

  // Check for admin access errors
  if (usersError || orgsError) {
    const errorMessage = (usersError as any)?.message || (orgsError as any)?.message;
    
    if (errorMessage?.includes("Admin access required") || errorMessage?.includes("403")) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have admin privileges to access this panel.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your administrator to request admin access.</p>
          </div>
        </div>
      );
    }
  }

  if (usersLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Filter users by search term and user type
  const filteredUsers = users.filter((user: User) => {
    // Filter by user type
    if (userTypeFilter === "admin" && !user.isAdmin) return false;
    if (userTypeFilter === "user" && user.isAdmin) return false;
    if (userTypeFilter === "not_registered" && !(user as any).mustChangePassword) return false;
    
    // Filter by search term
    if (userSearchFilter.trim()) {
      const search = userSearchFilter.toLowerCase();
      return (
        user.firstName?.toLowerCase().includes(search) ||
        user.lastName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.id?.toLowerCase().includes(search) ||
        user.organisationName?.toLowerCase().includes(search) ||
        (user as any).organisations?.some((org: Organisation) => org.name.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Filter organisations by search term
  const filteredOrgs = orgSearchFilter.trim()
    ? organisations.filter((org: Organisation) => {
        const search = orgSearchFilter.toLowerCase();
        return (
          org.name?.toLowerCase().includes(search) ||
          org.externalRef?.toLowerCase().includes(search) ||
          String(org.id).includes(search)
        );
      })
    : organisations;

  // Pagination calculations
  const usersTotalPages = Math.ceil((filteredUsers?.length || 0) / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);
  const orgsTotalPages = Math.ceil((filteredOrgs?.length || 0) / ITEMS_PER_PAGE);
  const paginatedOrgs = filteredOrgs.slice((orgsPage - 1) * ITEMS_PER_PAGE, orgsPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-600 text-sm sm:text-base">Comprehensive user and organisation management</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:items-center">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/system-monitoring">
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">System Monitoring</span>
              <span className="sm:hidden">System</span>
            </Button>
          </Link>
          <Link href="/admin-payment-performance-report">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Payment Performance</span>
              <span className="sm:hidden">Payments</span>
            </Button>
          </Link>
          <Link href="/recovery-analysis-report">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Recovery Analysis</span>
              <span className="sm:hidden">Recovery</span>
            </Button>
          </Link>
          {isSuperAdmin && (
            <Link href="/audit-management">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Audit Management</span>
                <span className="sm:hidden">Audit</span>
              </Button>
            </Link>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowClosedCaseManagement(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Closed Case Management</span>
            <span className="sm:hidden">Closed Cases</span>
          </Button>
        </div>
      </div>

      {/* Closed Case Management View */}
      {showClosedCaseManagement ? (
        <ClosedCaseManagement onBack={() => setShowClosedCaseManagement(false)} isSuperAdmin={isSuperAdmin} />
      ) : (
      <>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter((u: User) => !u.organisationId).length || 0} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organisations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active organisations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.filter((u: User) => u.isAdmin).length || 0}</div>
            <p className="text-xs text-muted-foreground">With admin privileges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">@chadlaw Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: User) => u.email?.endsWith('@chadlaw.co.uk')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Internal users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-full min-w-max sm:w-full sm:min-w-0">
            <TabsTrigger value="users" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="organisations" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Organisations</span>
              <span className="sm:hidden">Orgs</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Case Management</span>
              <span className="sm:hidden">Cases</span>
            </TabsTrigger>
            <TabsTrigger value="case-submissions" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Case Submissions</span>
              <span className="sm:hidden">Submits</span>
            </TabsTrigger>

            {isSuperAdmin && (
              <TabsTrigger value="integration" className="flex-1 text-xs sm:text-sm">
                <span className="hidden sm:inline">Integration</span>
                <span className="sm:hidden">API</span>
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="broadcast" className="flex-1 text-xs sm:text-sm">
                <span className="hidden sm:inline">Email Broadcast</span>
                <span className="sm:hidden">Email</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Scheduled Reports</span>
              <span className="sm:hidden">Reports</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create and manage user accounts with comprehensive controls</CardDescription>
                </div>
                <Dialog open={showCreateUser} onOpenChange={(open) => { setShowCreateUser(open); if (!open) setOrgSearchTerm(""); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with temporary password
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={userFormData.lastName}
                            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          placeholder="+44 20 7123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organisation">Organisation</Label>
                        <Select 
                          value={userFormData.organisationId?.toString() || "none"}
                          onValueChange={(value) => setUserFormData({ 
                            ...userFormData, 
                            organisationId: value === "none" ? undefined : parseInt(value) 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select organisation (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 pb-2">
                              <Input
                                placeholder="Search organisations..."
                                value={orgSearchTerm}
                                onChange={(e) => setOrgSearchTerm(e.target.value)}
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            <SelectItem value="none">No organisation</SelectItem>
                            {organisations
                              ?.filter((org: Organisation) => {
                                if (!orgSearchTerm.trim()) return true;
                                const search = orgSearchTerm.toLowerCase();
                                return org.name.toLowerCase().includes(search) || 
                                       (org.externalRef?.toLowerCase().includes(search) ?? false);
                              })
                              .map((org: Organisation) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{org.name}</span>
                                  {org.externalRef && (
                                    <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAdmin"
                          checked={userFormData.isAdmin}
                          onCheckedChange={(checked) => setUserFormData({ ...userFormData, isAdmin: checked as boolean })}
                        />
                        <Label htmlFor="isAdmin">Admin privileges</Label>
                      </div>
                      {userFormData.isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <p className="text-sm text-amber-700">
                              Admin privileges can only be assigned to @chadlaw.co.uk email addresses
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)} className="order-2 sm:order-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowConfirmCreateUser(true)}
                        disabled={!userFormData.firstName.trim() || !userFormData.lastName.trim() || !userFormData.email.trim()}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90 order-1 sm:order-2"
                      >
                        Create User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Confirmation Dialog */}
                <Dialog open={showConfirmCreateUser} onOpenChange={setShowConfirmCreateUser}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm User Creation</DialogTitle>
                      <DialogDescription>
                        Please review the details before creating this user account.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Name:</span>
                          <span className="text-sm font-medium">{userFormData.firstName} {userFormData.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="text-sm font-medium">{userFormData.email}</span>
                        </div>
                        {userFormData.phone && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Phone:</span>
                            <span className="text-sm font-medium">{userFormData.phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Organisation:</span>
                          <span className="text-sm font-medium">
                            {userFormData.organisationId 
                              ? organisations?.find((o: Organisation) => o.id === userFormData.organisationId)?.name || "Unknown"
                              : "No organisation"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Admin:</span>
                          <span className="text-sm font-medium">{userFormData.isAdmin ? "Yes" : "No"}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        A temporary password will be generated after confirmation.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <Button variant="outline" onClick={() => setShowConfirmCreateUser(false)} className="order-2 sm:order-1">
                        Go Back
                      </Button>
                      <Button
                        onClick={() => {
                          setShowConfirmCreateUser(false);
                          createUserMutation.mutate(userFormData);
                        }}
                        disabled={createUserMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90 order-1 sm:order-2"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Confirm & Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit User Details Dialog (Super Admins only) */}
                <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit User Details</DialogTitle>
                      <DialogDescription>
                        Update details for {editingUser?.email}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editFirstName">First Name</Label>
                        <Input
                          id="editFirstName"
                          value={editingUser?.firstName || ""}
                          onChange={(e) => setEditingUser(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editLastName">Last Name</Label>
                        <Input
                          id="editLastName"
                          value={editingUser?.lastName || ""}
                          onChange={(e) => setEditingUser(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                          placeholder="Last name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editEmail">Email Address</Label>
                        <Input
                          id="editEmail"
                          type="email"
                          value={editingUser?.email || ""}
                          onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                          placeholder="Email address"
                        />
                        <p className="text-xs text-amber-600">Warning: Changing email will affect the user's login credentials.</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowEditUser(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (editingUser && editingUser.firstName && editingUser.lastName && editingUser.email) {
                            updateUserNameMutation.mutate({
                              userId: editingUser.id,
                              firstName: editingUser.firstName,
                              lastName: editingUser.lastName,
                              email: editingUser.email
                            });
                          }
                        }}
                        disabled={updateUserNameMutation.isPending || !editingUser?.firstName?.trim() || !editingUser?.lastName?.trim() || !editingUser?.email?.trim()}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      >
                        {updateUserNameMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or organisation..."
                    value={userSearchFilter}
                    onChange={(e) => {
                      setUserSearchFilter(e.target.value);
                      setUsersPage(1); // Reset to first page when searching
                    }}
                    className="pl-10"
                  />
                </div>
                <Select 
                  value={userTypeFilter} 
                  onValueChange={(value: "all" | "admin" | "user" | "not_registered") => {
                    setUserTypeFilter(value);
                    setUsersPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="user">Non-Admins Only</SelectItem>
                    <SelectItem value="not_registered">Not Registered</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-gray-600">
                  Showing {paginatedUsers.length} of {filteredUsers?.length || 0} users
                  {(userSearchFilter || userTypeFilter !== "all") && ` (filtered from ${users?.length || 0})`}
                </div>
              </div>
              {/* Mobile Card Layout */}
              <div className="block sm:hidden space-y-4">
                {paginatedUsers?.map((user: User) => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </div>
                      <div className="flex gap-1">
                        {(user as any).isSuperAdmin && (
                          <Badge variant="default" className="bg-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-200 dark:text-fuchsia-700 text-xs font-semibold">
                            Admin+
                          </Badge>
                        )}
                        {user.isAdmin && !(user as any).isSuperAdmin && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                            Admin
                          </Badge>
                        )}
                        {(user as any).mustChangePassword && (
                          <Badge variant="default" className="bg-amber-100 text-amber-700 dark:bg-amber-100 dark:text-amber-700 text-xs">
                            Not Registered
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Email:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-right">{user.email}</span>
                          {user.email?.endsWith('@chadlaw.co.uk') && (
                            <Shield className="h-3 w-3 text-blue-600" />
                          )}
                          {(user as any).emailNotifications === false ? (
                            <BellOff className="h-3 w-3 text-gray-400" title="Message notifications disabled" />
                          ) : (
                            <Bell className="h-3 w-3 text-green-500" title="Message notifications enabled" />
                          )}
                          {(user as any).documentNotifications === false ? (
                            <FileX className="h-3 w-3 text-gray-400" title="Document notifications disabled" />
                          ) : (
                            <FilePlus className="h-3 w-3 text-green-500" title="Document notifications enabled" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span>{user.phone || "-"}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-gray-600">Organisations:</span>
                        <div className="space-y-1">
                          {/* Legacy organisation (from organisationId field) */}
                          {user.organisationName && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {user.organisationName}
                              </Badge>
                              <span className="text-xs text-gray-500">(legacy)</span>
                            </div>
                          )}
                          {/* Additional organisations (from junction table) */}
                          {(user as any).organisations?.map((org: Organisation & { role?: string }) => (
                            <div key={org.id} className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {org.name}
                              </Badge>
                              {org.role === 'owner' && (
                                <Badge variant="default" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                                  Owner
                                </Badge>
                              )}
                              {!user.isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-5 px-1 text-xs ${org.role === 'owner' ? 'text-amber-600 hover:text-amber-800' : 'text-gray-500 hover:text-gray-700'}`}
                                  onClick={() => {
                                    const newRole = org.role === 'owner' ? 'member' : 'owner';
                                    const action = newRole === 'owner' ? 'make an Owner of' : 'remove as Owner from';
                                    const confirmation = confirm(`${action} ${org.name} for ${user.firstName} ${user.lastName}?`);
                                    if (confirmation) {
                                      setUserOrgRoleMutation.mutate({
                                        userId: user.id,
                                        organisationId: org.id,
                                        role: newRole
                                      });
                                    }
                                  }}
                                  disabled={setUserOrgRoleMutation.isPending}
                                  title={org.role === 'owner' ? 'Remove Owner role' : 'Make Owner'}
                                >
                                  <Crown className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-3 w-3 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  const confirmation = confirm(`Remove ${user.firstName} ${user.lastName} from ${org.name}?`);
                                  if (confirmation) {
                                    removeUserFromOrgMutation.mutate({
                                      userId: user.id,
                                      organisationId: org.id
                                    });
                                  }
                                }}
                                disabled={removeUserFromOrgMutation.isPending}
                                title={`Remove from ${org.name}`}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!user.organisationName && !(user as any).organisations?.length && (
                            <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Scheduled Reports Row - Super Admin Only */}
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between pt-2 pb-2 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Scheduled Reports:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                          onClick={() => openScheduledReportDialog(user)}
                          title="Configure scheduled reports"
                        >
                          {scheduledReportsMap[user.id]?.length > 0 ? (
                            (() => {
                              const reports = scheduledReportsMap[user.id];
                              const enabledCount = reports.filter((r: any) => r.enabled).length;
                              return enabledCount > 0 ? (
                                <div className="flex items-center text-green-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span className="text-xs">{enabledCount} active</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-gray-400">
                                  <CalendarOff className="h-4 w-4 mr-1" />
                                  <span className="text-xs">{reports.length} (off)</span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <CalendarOff className="h-4 w-4 mr-1" />
                              <span className="text-xs">None</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignUser(true);
                        }}
                        title="Assign user to organisation"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPasswordMutation.mutate(user.id)}
                        disabled={resetPasswordMutation.isPending}
                        title="Reset user password"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hasTemporaryPassword = (user as any).temporaryPassword;
                          const message = hasTemporaryPassword
                            ? `Send welcome email to ${user.firstName} ${user.lastName}?\n\nThis will send their username and temporary password to ${user.email}.`
                            : `Send welcome email to ${user.firstName} ${user.lastName}?\n\nNote: This user has already logged in, so the email will include instructions to reset their password if needed.`;
                          
                          const confirmation = confirm(message);
                          if (confirmation) {
                            sendWelcomeEmailMutation.mutate(user.id);
                          }
                        }}
                        disabled={sendWelcomeEmailMutation.isPending}
                        title="Send welcome email with login details"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) {
                            alert('Admin privileges can only be granted to @chadlaw.co.uk email addresses.');
                            return;
                          }
                          
                          const action = user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
                          const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                          if (confirmation) {
                            toggleAdminMutation.mutate({
                              userId: user.id,
                              makeAdmin: !user.isAdmin
                            });
                          }
                        }}
                        disabled={toggleAdminMutation.isPending || (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk'))}
                        className={(!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) ? 'opacity-50 cursor-not-allowed' : ''}
                        title={user.isAdmin ? "Remove admin privileges" : "Grant admin privileges"}
                      >
                        {user.isAdmin ? (
                          <ShieldCheck className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        Admin
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUser(user);
                            setShowEditUser(true);
                          }}
                          title="Edit user details"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {isSuperAdmin && user.isAdmin && user.email?.endsWith('@chadlaw.co.uk') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (user.id === currentUser?.id) {
                              alert('You cannot change your own super admin status.');
                              return;
                            }
                            const action = (user as any).isSuperAdmin ? 'remove super admin privileges from' : 'grant super admin privileges to';
                            const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                            if (confirmation) {
                              toggleSuperAdminMutation.mutate({
                                userId: user.id,
                                makeSuperAdmin: !(user as any).isSuperAdmin
                              });
                            }
                          }}
                          disabled={toggleSuperAdminMutation.isPending || user.id === currentUser?.id}
                          className={(user as any).isSuperAdmin ? 'border-purple-300' : ''}
                          title={(user as any).isSuperAdmin ? "Remove super admin privileges" : "Grant super admin privileges"}
                        >
                          {(user as any).isSuperAdmin ? (
                            <ShieldAlert className="h-3 w-3 text-purple-600" />
                          ) : (
                            <ShieldAlert className="h-3 w-3 text-gray-400" />
                          )}
                          Super
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentValue = (user as any).canSubmitCases !== false;
                          const action = currentValue ? 'disable' : 'enable';
                          const confirmation = confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} case submission for ${user.firstName} ${user.lastName}?`);
                          if (confirmation) {
                            toggleCaseSubmissionMutation.mutate({
                              userId: user.id,
                              canSubmitCases: !currentValue
                            });
                          }
                        }}
                        disabled={toggleCaseSubmissionMutation.isPending}
                        title={(user as any).canSubmitCases !== false ? "Can submit cases - click to disable" : "Cannot submit cases - click to enable"}
                      >
                        {(user as any).canSubmitCases !== false ? (
                          <FilePlus className="h-3 w-3 text-green-600" />
                        ) : (
                          <FileX className="h-3 w-3 text-gray-400" />
                        )}
                        Cases
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const confirmation = confirm(`Force logout ${user.firstName} ${user.lastName}? This will end all their active sessions and require them to log in again.`);
                          if (confirmation) {
                            forceLogoutMutation.mutate({ userId: user.id, reason: 'Admin initiated force logout' });
                          }
                        }}
                        disabled={forceLogoutMutation.isPending}
                        className="text-orange-600 hover:text-orange-700"
                        title="Force logout user (end all sessions)"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Logout
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const confirmation = confirm(`Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This action cannot be undone.`);
                            if (confirmation) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                          title="Delete user permanently"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Status</TableHead>
                      {isSuperAdmin && <TableHead>Reports</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{user.email}</span>
                            {user.email?.endsWith('@chadlaw.co.uk') && (
                              <Shield className="h-3 w-3 text-blue-600" />
                            )}
                            {(user as any).emailNotifications === false ? (
                              <BellOff className="h-3 w-3 text-gray-400" title="Message notifications disabled" />
                            ) : (
                              <Bell className="h-3 w-3 text-green-500" title="Message notifications enabled" />
                            )}
                            {(user as any).documentNotifications === false ? (
                              <FileX className="h-3 w-3 text-gray-400" title="Document notifications disabled" />
                            ) : (
                              <FilePlus className="h-3 w-3 text-green-500" title="Document notifications enabled" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* Legacy organisation (from organisationId field) */}
                            {user.organisationName && (
                              <Badge variant="outline" className="mr-1 mb-1">
                                {user.organisationName}
                              </Badge>
                            )}
                            {/* Additional organisations (from junction table) */}
                            {(user as any).organisations?.map((org: Organisation & { role?: string }) => (
                              <div key={org.id} className="flex items-center gap-1 mb-1 flex-wrap">
                                <Badge variant="outline" className="mr-1">
                                  {org.name}
                                </Badge>
                                {org.role === 'owner' && (
                                  <Badge variant="default" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 mr-1">
                                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                                    Owner
                                  </Badge>
                                )}
                                {!user.isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-5 w-5 p-0 ${org.role === 'owner' ? 'text-amber-600 hover:text-amber-800' : 'text-gray-400 hover:text-gray-600'}`}
                                    onClick={() => {
                                      const newRole = org.role === 'owner' ? 'member' : 'owner';
                                      const action = newRole === 'owner' ? 'make an Owner of' : 'remove as Owner from';
                                      const confirmation = confirm(`${action} ${org.name} for ${user.firstName} ${user.lastName}?`);
                                      if (confirmation) {
                                        setUserOrgRoleMutation.mutate({
                                          userId: user.id,
                                          organisationId: org.id,
                                          role: newRole
                                        });
                                      }
                                    }}
                                    disabled={setUserOrgRoleMutation.isPending}
                                    title={org.role === 'owner' ? 'Remove Owner role' : 'Make Owner'}
                                  >
                                    <Crown className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    const confirmation = confirm(`Remove ${user.firstName} ${user.lastName} from ${org.name}?`);
                                    if (confirmation) {
                                      removeUserFromOrgMutation.mutate({
                                        userId: user.id,
                                        organisationId: org.id
                                      });
                                    }
                                  }}
                                  disabled={removeUserFromOrgMutation.isPending}
                                  title={`Remove from ${org.name}`}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                            {!user.organisationName && !(user as any).organisations?.length && (
                              <Badge variant="secondary">Unassigned</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {(user as any).isSuperAdmin && (
                              <Badge variant="default" className="bg-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-200 dark:text-fuchsia-700 font-semibold">
                                Admin+
                              </Badge>
                            )}
                            {user.isAdmin && !(user as any).isSuperAdmin && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">
                                Admin
                              </Badge>
                            )}
                            {(user as any).mustChangePassword && (
                              <Badge variant="default" className="bg-amber-100 text-amber-700 dark:bg-amber-100 dark:text-amber-700">
                                Not Registered
                              </Badge>
                            )}
                            <Badge variant="outline">Active</Badge>
                          </div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => openScheduledReportDialog(user)}
                              title="Configure scheduled reports"
                            >
                              {scheduledReportsMap[user.id]?.length > 0 ? (
                                (() => {
                                  const reports = scheduledReportsMap[user.id];
                                  const enabledCount = reports.filter((r: any) => r.enabled).length;
                                  return enabledCount > 0 ? (
                                    <div className="flex items-center text-green-600">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      <span className="text-xs">{enabledCount} active</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-gray-400">
                                      <CalendarOff className="h-4 w-4 mr-1" />
                                      <span className="text-xs">{reports.length} (off)</span>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex items-center text-gray-300">
                                  <CalendarOff className="h-4 w-4" />
                                </div>
                              )}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAssignUser(true);
                              }}
                              title="Assign to organisation"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetPasswordMutation.mutate(user.id)}
                              disabled={resetPasswordMutation.isPending}
                              title="Reset user password"
                            >
                              <Key className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const hasTemporaryPassword = (user as any).temporaryPassword;
                                const message = hasTemporaryPassword
                                  ? `Send welcome email to ${user.firstName} ${user.lastName}?\n\nThis will send their username and temporary password to ${user.email}.`
                                  : `Send welcome email to ${user.firstName} ${user.lastName}?\n\nNote: This user has already logged in, so the email will include instructions to reset their password if needed.`;
                                
                                const confirmation = confirm(message);
                                if (confirmation) {
                                  sendWelcomeEmailMutation.mutate(user.id);
                                }
                              }}
                              disabled={sendWelcomeEmailMutation.isPending}
                              title="Send welcome email with login details"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Check if trying to grant admin to non-chadlaw email
                                if (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) {
                                  alert('Admin privileges can only be granted to @chadlaw.co.uk email addresses.');
                                  return;
                                }
                                
                                const action = user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
                                const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                                if (confirmation) {
                                  toggleAdminMutation.mutate({
                                    userId: user.id,
                                    makeAdmin: !user.isAdmin
                                  });
                                }
                              }}
                              disabled={toggleAdminMutation.isPending || (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk'))}
                              className={(!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) ? 'opacity-50 cursor-not-allowed' : ''}
                              title={user.isAdmin ? "Remove admin privileges" : "Grant admin privileges"}
                            >
                              {user.isAdmin ? (
                                <ShieldCheck className="h-3 w-3 text-blue-600" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowEditUser(true);
                                }}
                                title="Edit user details"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {isSuperAdmin && user.isAdmin && user.email?.endsWith('@chadlaw.co.uk') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (user.id === currentUser?.id) {
                                    alert('You cannot change your own super admin status.');
                                    return;
                                  }
                                  const action = (user as any).isSuperAdmin ? 'remove super admin privileges from' : 'grant super admin privileges to';
                                  const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                                  if (confirmation) {
                                    toggleSuperAdminMutation.mutate({
                                      userId: user.id,
                                      makeSuperAdmin: !(user as any).isSuperAdmin
                                    });
                                  }
                                }}
                                disabled={toggleSuperAdminMutation.isPending || user.id === currentUser?.id}
                                className={(user as any).isSuperAdmin ? 'border-purple-300' : ''}
                                title={(user as any).isSuperAdmin ? "Remove super admin privileges" : "Grant super admin privileges"}
                              >
                                {(user as any).isSuperAdmin ? (
                                  <ShieldAlert className="h-3 w-3 text-purple-600" />
                                ) : (
                                  <ShieldAlert className="h-3 w-3 text-gray-400" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentValue = (user as any).canSubmitCases !== false;
                                const action = currentValue ? 'disable' : 'enable';
                                const confirmation = confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} case submission for ${user.firstName} ${user.lastName}?`);
                                if (confirmation) {
                                  toggleCaseSubmissionMutation.mutate({
                                    userId: user.id,
                                    canSubmitCases: !currentValue
                                  });
                                }
                              }}
                              disabled={toggleCaseSubmissionMutation.isPending}
                              title={(user as any).canSubmitCases !== false ? "Can submit cases - click to disable" : "Cannot submit cases - click to enable"}
                            >
                              {(user as any).canSubmitCases !== false ? (
                                <FilePlus className="h-3 w-3 text-green-600" />
                              ) : (
                                <FileX className="h-3 w-3 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const confirmation = confirm(`Force logout ${user.firstName} ${user.lastName}? This will end all their active sessions.`);
                                if (confirmation) {
                                  forceLogoutMutation.mutate({ userId: user.id, reason: 'Admin initiated force logout' });
                                }
                              }}
                              disabled={forceLogoutMutation.isPending}
                              className="text-orange-600 hover:text-orange-700"
                              title="Force logout user (end all sessions)"
                            >
                              <LogOut className="h-3 w-3" />
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const confirmation = confirm(`Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This action cannot be undone.`);
                                  if (confirmation) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                                disabled={deleteUserMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                                title="Delete user permanently"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <Pagination 
                currentPage={usersPage} 
                totalPages={usersTotalPages} 
                onPageChange={setUsersPage} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisations Tab */}
        <TabsContent value="organisations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organisations</CardTitle>
                  <CardDescription>Manage client organisations</CardDescription>
                </div>
                <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Organisation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Organisation</DialogTitle>
                      <DialogDescription>
                        Add a new client organisation to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organisation Name</Label>
                        <Input
                          id="name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organisation name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalRef">Client Code (Optional)</Label>
                        <Input
                          id="externalRef"
                          value={newOrgExternalRef}
                          onChange={(e) => setNewOrgExternalRef(e.target.value)}
                          placeholder="e.g., ABC123 or ABC123,DEF456,GHI789"
                        />
                        <p className="text-sm text-muted-foreground">
                          Client code from case management system. For multiple codes, separate with commas (e.g., ABC123,DEF456).
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        setShowCreateOrg(false);
                        setNewOrgName("");
                        setNewOrgExternalRef("");
                      }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('Frontend sending data:', { 
                            name: newOrgName, 
                            externalRef: newOrgExternalRef || undefined 
                          });
                          createOrganisationMutation.mutate({ 
                            name: newOrgName, 
                            externalRef: newOrgExternalRef || undefined 
                          });
                        }}
                        disabled={createOrganisationMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      >
                        {createOrganisationMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or client code..."
                    value={orgSearchFilter}
                    onChange={(e) => {
                      setOrgSearchFilter(e.target.value);
                      setOrgsPage(1); // Reset to first page when searching
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Showing {paginatedOrgs.length} of {filteredOrgs?.length || 0} organisations
                  {orgSearchFilter && ` (filtered from ${organisations?.length || 0})`}
                </div>
              </div>
              {/* Mobile Card Layout */}
              <div className="block sm:hidden space-y-4">
                {paginatedOrgs?.map((org: Organisation) => {
                  const orgReportCount = orgScheduledReportsMap[org.id]?.length || 0;
                  return (
                    <div key={org.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-gray-500">ID: {org.id}</div>
                          {org.externalRef && (
                            <div className="text-xs text-gray-400">Code: {org.externalRef}</div>
                          )}
                        </div>
                        <Badge variant="outline">{org.userCount} users</Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{new Date(org.createdAt).toLocaleDateString('en-GB')}</span>
                        </div>
                        
                        {isSuperAdmin && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Scheduled Reports:</span>
                            {orgReportCount > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-acclaim-teal hover:text-acclaim-teal/80 p-1 h-auto"
                                onClick={() => {
                                  setSelectedOrgForReports(org);
                                  setShowOrgReportsDialog(true);
                                }}
                                title="View and manage scheduled reports"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                <span className="text-xs">{orgReportCount} report{orgReportCount !== 1 ? 's' : ''}</span>
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className={`grid ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-2 border-t border-gray-200`}>
                        {isSuperAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedOrgForSchedule(org);
                              setOrgScheduleForm({
                                recipientEmail: '',
                                recipientName: '',
                                frequency: 'weekly',
                                dayOfWeek: 1,
                                dayOfMonth: 1,
                                timeOfDay: 9,
                                includeCaseSummary: true,
                                includeActivityReport: true,
                                caseStatusFilter: 'active',
                              });
                              setShowOrgScheduleDialog(true);
                            }}
                            title="Schedule a new report for this organisation"
                            className="text-acclaim-teal hover:text-acclaim-teal/80"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Report
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingOrg(org);
                            setOrgFormData({ 
                              name: org.name, 
                              externalRef: org.externalRef || undefined 
                            });
                            setShowEditOrg(true);
                          }}
                          title="Edit organisation details"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {isSuperAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                                deleteOrganisationMutation.mutate(org.id);
                              }
                            }}
                            disabled={deleteOrganisationMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="Delete organisation permanently"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Users</TableHead>
                      {isSuperAdmin && <TableHead>Scheduled Reports</TableHead>}
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrgs?.map((org: Organisation) => {
                      const orgReportCount = orgScheduledReportsMap[org.id]?.length || 0;
                      return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-gray-500">ID: {org.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.userCount} users</Badge>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            {orgReportCount > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-acclaim-teal hover:text-acclaim-teal/80"
                                onClick={() => {
                                  setSelectedOrgForReports(org);
                                  setShowOrgReportsDialog(true);
                                }}
                                title="View and manage scheduled reports"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{orgReportCount} report{orgReportCount !== 1 ? 's' : ''}</span>
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {isSuperAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrgForSchedule(org);
                                  setOrgScheduleForm({
                                    recipientEmail: '',
                                    recipientName: '',
                                    frequency: 'weekly',
                                    dayOfWeek: 1,
                                    dayOfMonth: 1,
                                    timeOfDay: 9,
                                    includeCaseSummary: true,
                                    includeActivityReport: true,
                                    caseStatusFilter: 'active',
                                  });
                                  setShowOrgScheduleDialog(true);
                                }}
                                title="Schedule a new report for this organisation"
                                className="text-acclaim-teal hover:text-acclaim-teal/80"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingOrg(org);
                                setOrgFormData({ 
                                  name: org.name, 
                                  externalRef: org.externalRef || undefined 
                                });
                                setShowEditOrg(true);
                              }}
                              title="Edit organisation details"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {isSuperAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                                    deleteOrganisationMutation.mutate(org.id);
                                  }
                                }}
                                disabled={deleteOrganisationMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                                title="Delete organisation permanently"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <Pagination 
                currentPage={orgsPage} 
                totalPages={orgsTotalPages} 
                onPageChange={setOrgsPage} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Case Management</CardTitle>
                  <CardDescription>Archive or permanently delete cases across all organisations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CaseManagementTab isSuperAdmin={isSuperAdmin} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Case Submissions Tab */}
        <TabsContent value="case-submissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Case Submissions</CardTitle>
                  <CardDescription>Review and manage case submissions from users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CaseSubmissionsTab isSuperAdmin={isSuperAdmin} />
            </CardContent>
          </Card>
        </TabsContent>



        {/* Integration Tab - Super Admin Only */}
        {isSuperAdmin && (
          <TabsContent value="integration">
            <CaseManagementGuideDownload />
          </TabsContent>
        )}

        {/* Email Broadcast Tab - Super Admin Only */}
        {isSuperAdmin && (
          <TabsContent value="broadcast">
            <EmailBroadcast />
          </TabsContent>
        )}

        {/* Scheduled Reports Overview Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>All Scheduled Reports</CardTitle>
                    <CardDescription>
                      View and manage all scheduled reports across all users and organisations
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-reports"] })}
                    disabled={scheduledReportsFetching}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${scheduledReportsFetching ? 'animate-spin' : ''}`} />
                    {scheduledReportsFetching ? 'Loading...' : 'Refresh'}
                  </Button>
                  <Badge variant="secondary">
                    {scheduledReports.length} report{scheduledReports.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledReports.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium text-lg mb-1">No Scheduled Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure scheduled reports for users via the Users tab, or for organisations via the Organisations tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...scheduledReports].sort((a: any, b: any) => {
                    const orgA = organisations?.find((o: any) => o.id === a.organisationId);
                    const orgB = organisations?.find((o: any) => o.id === b.organisationId);
                    const nameA = a.recipientEmail ? (a.recipientName || a.recipientEmail) : (a.userName || '');
                    const nameB = b.recipientEmail ? (b.recipientName || b.recipientEmail) : (b.userName || '');
                    const nameCompare = nameA.localeCompare(nameB);
                    if (nameCompare !== 0) return nameCompare;
                    return (orgA?.name || '').localeCompare(orgB?.name || '');
                  }).map((report: any) => {
                    const org = organisations?.find((o: any) => o.id === report.organisationId);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const formatTime = (hour: number) => {
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const h = hour % 12 || 12;
                      return `${h}:00 ${ampm}`;
                    };
                    const frequencyLabel = report.frequency === 'daily' 
                      ? 'Daily' 
                      : report.frequency === 'weekly' 
                        ? `Weekly on ${dayNames[report.dayOfWeek || 0]}`
                        : `Monthly on day ${report.dayOfMonth || 1}`;
                    const isExpanded = expandedReportId === report.id;
                    const isOrgLevelReport = !!report.recipientEmail;
                    
                    return (
                      <div 
                        key={report.id} 
                        className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              isOrgLevelReport 
                                ? 'bg-purple-100 dark:bg-purple-900/30' 
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              {isOrgLevelReport ? (
                                <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              ) : (
                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">
                                  {isOrgLevelReport 
                                    ? `${org?.name || 'Unknown Org'} → ${report.recipientName || report.recipientEmail}`
                                    : report.userName || 'Unknown User'
                                  }
                                </span>
                                {report.enabled ? (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                )}
                                {isOrgLevelReport && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                                    Org Report
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {frequencyLabel} at {formatTime(report.timeOfDay || 9)}
                                {org && !isOrgLevelReport && ` • ${org.name}`}
                                {!report.organisationId && !isOrgLevelReport && ' • Combined (all orgs)'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {report.lastSentAt && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                Last: {new Date(report.lastSentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" /> Created By
                                </Label>
                                <p className="text-sm font-medium">{report.userName}</p>
                                <p className="text-xs text-muted-foreground">{report.userEmail}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building className="h-3 w-3" /> Organisation
                                </Label>
                                <p className="text-sm font-medium">
                                  {report.organisationId 
                                    ? org?.name || `Org #${report.organisationId}` 
                                    : 'Combined (all user orgs)'
                                  }
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Send className="h-3 w-3" /> Sends To
                                </Label>
                                <p className="text-sm font-medium">
                                  {report.recipientEmail || report.userEmail}
                                </p>
                                {report.recipientName && (
                                  <p className="text-xs text-muted-foreground">({report.recipientName})</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Schedule
                                </Label>
                                <p className="text-sm font-medium">{frequencyLabel}</p>
                                <p className="text-xs text-muted-foreground">at {formatTime(report.timeOfDay || 9)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Content
                                </Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {report.includeCaseSummary && (
                                    <Badge variant="secondary" className="text-xs">Case Summary</Badge>
                                  )}
                                  {report.includeActivityReport && (
                                    <Badge variant="secondary" className="text-xs">Messages</Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Activity className="h-3 w-3" /> Case Filter
                                </Label>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {report.caseStatusFilter === 'active' ? 'Active Cases' : 
                                   report.caseStatusFilter === 'closed' ? 'Closed Cases' : 'All Cases'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground">
                                {report.lastSentAt ? (
                                  <>Last sent: {new Date(report.lastSentAt).toLocaleDateString('en-GB', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}</>
                                ) : (
                                  <span className="italic">Never sent</span>
                                )}
                                {' • '}Created: {new Date(report.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                                {' • '}ID: {report.id}
                              </div>
                              {isSuperAdmin && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReportForAudit(report);
                                      setShowReportAuditDialog(true);
                                    }}
                                  >
                                    <History className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Audit </span>Logs
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendTestReportMutation.mutate(report.id);
                                    }}
                                    disabled={sendTestReportMutation.isPending}
                                  >
                                    {sendTestReportMutation.isPending ? (
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3 mr-1" />
                                    )}
                                    <span className="hidden sm:inline">Send </span>Test
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingFromReportsTab(true);
                                      if (isOrgLevelReport) {
                                        const reportOrg = organisations?.find((o: any) => o.id === report.organisationId);
                                        if (reportOrg) {
                                          setSelectedOrgForReports(reportOrg);
                                          setEditingOrgReport(report);
                                          setOrgScheduleForm({
                                            recipientEmail: report.recipientEmail || '',
                                            recipientName: report.recipientName || '',
                                            frequency: report.frequency || 'weekly',
                                            dayOfWeek: report.dayOfWeek ?? 1,
                                            dayOfMonth: report.dayOfMonth ?? 1,
                                            timeOfDay: report.timeOfDay ?? 9,
                                            includeCaseSummary: report.includeCaseSummary ?? true,
                                            includeActivityReport: report.includeActivityReport ?? true,
                                            caseStatusFilter: report.caseStatusFilter || 'active',
                                            enabled: report.enabled ?? true,
                                          });
                                          setShowEditOrgReportForm(true);
                                          setShowOrgReportsDialog(true);
                                        }
                                      } else {
                                        const user = users?.find((u: any) => u.id === report.userId);
                                        if (user) {
                                          setScheduledReportUser(user);
                                          setEditingReportId(report.id);
                                          setScheduledReportOrgId(report.organisationId || null);
                                          setScheduledReportEnabled(report.enabled ?? false);
                                          setScheduledReportFrequency(report.frequency || 'weekly');
                                          setScheduledReportDayOfWeek(report.dayOfWeek ?? 1);
                                          setScheduledReportDayOfMonth(report.dayOfMonth ?? 1);
                                          setScheduledReportTimeOfDay(report.timeOfDay ?? 9);
                                          setScheduledReportCaseSummary(report.includeCaseSummary ?? true);
                                          setScheduledReportActivity(report.includeActivityReport ?? true);
                                          setScheduledReportCaseFilter(report.caseStatusFilter || 'active');
                                          setShowReportEditForm(true);
                                          setShowScheduledReportDialog(true);
                                        }
                                      }
                                    }}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg flex items-start gap-2">
                    <Activity className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p><strong>User reports:</strong> Configure via the Calendar icon in the Users tab.</p>
                      <p><strong>Organisation reports:</strong> Configure via the Calendar icon in the Organisations tab (sends to external recipients).</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>
              Update the organisation details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Organisation Name</Label>
              <Input
                id="editOrgName"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                placeholder="Enter organisation name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOrgExternalRef">Client Code (Optional)</Label>
              <Input
                id="editOrgExternalRef"
                value={orgFormData.externalRef || ""}
                onChange={(e) => setOrgFormData({ ...orgFormData, externalRef: e.target.value || undefined })}
                placeholder="e.g., ABC123 or ABC123,DEF456,GHI789"
              />
              <p className="text-sm text-muted-foreground">
                Client code from case management system. For multiple codes, separate with commas (e.g., ABC123,DEF456).
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowEditOrg(false);
              setEditingOrg(null);
              setOrgFormData({ name: "", externalRef: "" });
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingOrg) {
                  updateOrganisationMutation.mutate({ 
                    id: editingOrg.id, 
                    data: orgFormData 
                  });
                }
              }}
              disabled={updateOrganisationMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {updateOrganisationMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Org-level Scheduled Report Dialog */}
      <Dialog open={showOrgScheduleDialog} onOpenChange={setShowOrgScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Report for {selectedOrgForSchedule?.name}</DialogTitle>
            <DialogDescription>
              Create a scheduled report for this organisation. The report will be sent to the email address you specify.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={orgScheduleForm.recipientEmail}
                onChange={(e) => setOrgScheduleForm({ ...orgScheduleForm, recipientEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                value={orgScheduleForm.recipientName}
                onChange={(e) => setOrgScheduleForm({ ...orgScheduleForm, recipientName: e.target.value })}
                placeholder="Contact Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select 
                value={orgScheduleForm.frequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setOrgScheduleForm({ ...orgScheduleForm, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {orgScheduleForm.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select 
                  value={String(orgScheduleForm.dayOfWeek)} 
                  onValueChange={(value) => setOrgScheduleForm({ ...orgScheduleForm, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {orgScheduleForm.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select 
                  value={String(orgScheduleForm.dayOfMonth)} 
                  onValueChange={(value) => setOrgScheduleForm({ ...orgScheduleForm, dayOfMonth: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Time of Day (Hour)</Label>
              <Select 
                value={String(orgScheduleForm.timeOfDay)} 
                onValueChange={(value) => setOrgScheduleForm({ ...orgScheduleForm, timeOfDay: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hour.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Case Status Filter</Label>
              <Select 
                value={orgScheduleForm.caseStatusFilter} 
                onValueChange={(value: 'active' | 'all' | 'closed') => setOrgScheduleForm({ ...orgScheduleForm, caseStatusFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Cases Only</SelectItem>
                  <SelectItem value="all">All Cases</SelectItem>
                  <SelectItem value="closed">Closed Cases Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="includeCaseSummary"
                checked={orgScheduleForm.includeCaseSummary}
                onCheckedChange={(checked) => setOrgScheduleForm({ ...orgScheduleForm, includeCaseSummary: checked })}
              />
              <Label htmlFor="includeCaseSummary">Include Case Summary</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="includeActivityReport"
                checked={orgScheduleForm.includeActivityReport}
                onCheckedChange={(checked) => setOrgScheduleForm({ ...orgScheduleForm, includeActivityReport: checked })}
              />
              <Label htmlFor="includeActivityReport">Include Activity Report (Messages)</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowOrgScheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!orgScheduleForm.recipientEmail || !selectedOrgForSchedule) {
                  toast({
                    title: "Error",
                    description: "Please enter a recipient email address",
                    variant: "destructive",
                  });
                  return;
                }
                createOrgScheduledReportMutation.mutate({
                  organisationId: selectedOrgForSchedule.id,
                  recipientEmail: orgScheduleForm.recipientEmail,
                  recipientName: orgScheduleForm.recipientName,
                  frequency: orgScheduleForm.frequency,
                  dayOfWeek: orgScheduleForm.frequency === 'weekly' ? orgScheduleForm.dayOfWeek : undefined,
                  dayOfMonth: orgScheduleForm.frequency === 'monthly' ? orgScheduleForm.dayOfMonth : undefined,
                  timeOfDay: orgScheduleForm.timeOfDay,
                  includeCaseSummary: orgScheduleForm.includeCaseSummary,
                  includeActivityReport: orgScheduleForm.includeActivityReport,
                  caseStatusFilter: orgScheduleForm.caseStatusFilter,
                });
              }}
              disabled={createOrgScheduledReportMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {createOrgScheduledReportMutation.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Manage Organisation Scheduled Reports Dialog */}
      <Dialog open={showOrgReportsDialog} onOpenChange={(open) => {
        setShowOrgReportsDialog(open);
        if (!open) {
          setSelectedOrgForReports(null);
          setEditingOrgReport(null);
          setShowEditOrgReportForm(false);
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Scheduled Reports for {selectedOrgForReports?.name}
            </DialogTitle>
            <DialogDescription>
              View, edit, or delete scheduled reports for this organisation
            </DialogDescription>
          </DialogHeader>
          
          {!showEditOrgReportForm ? (
            <div className="space-y-4">
              {orgReportsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin h-8 w-8 border-2 border-acclaim-teal border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading scheduled reports...</p>
                </div>
              ) : selectedOrgReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled reports for this organisation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedOrgReports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            {report.recipientEmail || report.userEmail}
                            {report.recipientName && (
                              <span className="text-gray-500 text-sm">({report.recipientName})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                            <Badge variant={report.recipientEmail ? "outline" : "secondary"} className={report.recipientEmail ? "border-acclaim-teal text-acclaim-teal" : "border-purple-500 text-purple-600"}>
                              {report.recipientEmail ? "Organisation" : "User"}
                            </Badge>
                            <Badge variant={report.enabled ? "default" : "secondary"}>
                              {report.enabled ? "Active" : "Disabled"}
                            </Badge>
                            <span className="capitalize">{report.frequency}</span>
                            <span>at {report.timeOfDay}:00</span>
                            {report.frequency === 'weekly' && (
                              <span>
                                ({['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][report.dayOfWeek || 0]})
                              </span>
                            )}
                            {report.frequency === 'monthly' && (
                              <span>(Day {report.dayOfMonth || 1})</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-3">
                            {report.includeCaseSummary && <span>Case Summary</span>}
                            {report.includeActivityReport && <span>Messages</span>}
                            <span className="capitalize">({report.caseStatusFilter || 'active'} cases)</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Created by: {report.userName || 'Unknown'}
                            {report.lastSentAt && (
                              <span> • Last sent: {new Date(report.lastSentAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReportForAudit(report);
                              setShowReportAuditDialog(true);
                            }}
                            title="View audit logs"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const recipient = report.recipientEmail || report.userEmail;
                              if (confirm(`Send a test report now to ${recipient}?`)) {
                                sendTestReportMutation.mutate(report.id);
                              }
                            }}
                            disabled={sendTestReportMutation.isPending}
                            title="Send test report"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingOrgReport(report);
                              setOrgScheduleForm({
                                recipientEmail: report.recipientEmail || '',
                                recipientName: report.recipientName || '',
                                frequency: report.frequency || 'weekly',
                                dayOfWeek: report.dayOfWeek || 1,
                                dayOfMonth: report.dayOfMonth || 1,
                                timeOfDay: report.timeOfDay || 9,
                                includeCaseSummary: report.includeCaseSummary ?? true,
                                includeActivityReport: report.includeActivityReport ?? true,
                                caseStatusFilter: report.caseStatusFilter || 'active',
                                enabled: report.enabled ?? true,
                              });
                              setShowEditOrgReportForm(true);
                            }}
                            title="Edit report"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this scheduled report?")) {
                                deleteScheduledReportMutation.mutate(report.id);
                              }
                            }}
                            disabled={deleteScheduledReportMutation.isPending}
                            title="Delete report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedOrgForReports) {
                      setSelectedOrgForSchedule(selectedOrgForReports);
                      setOrgScheduleForm({
                        recipientEmail: '',
                        recipientName: '',
                        frequency: 'weekly',
                        dayOfWeek: 1,
                        dayOfMonth: 1,
                        timeOfDay: 9,
                        includeCaseSummary: true,
                        includeActivityReport: true,
                        caseStatusFilter: 'active',
                      });
                      setShowOrgReportsDialog(false);
                      setShowOrgScheduleDialog(true);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Report
                </Button>
                <Button variant="outline" onClick={() => setShowOrgReportsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show read-only user info for user-level reports, editable fields for org-level reports */}
              {editingOrgReport && !editingOrgReport.recipientEmail ? (
                <>
                  <div className="space-y-2">
                    <Label>User Email</Label>
                    <Input
                      value={editingOrgReport.userEmail || ''}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>User Name</Label>
                    <Input
                      value={editingOrgReport.userName || ''}
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500">This is a user-level report. The recipient cannot be changed.</p>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editRecipientEmail">Recipient Email</Label>
                    <Input
                      id="editRecipientEmail"
                      type="email"
                      value={orgScheduleForm.recipientEmail}
                      onChange={(e) => setOrgScheduleForm({ ...orgScheduleForm, recipientEmail: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editRecipientName">Recipient Name (optional)</Label>
                    <Input
                      id="editRecipientName"
                      value={orgScheduleForm.recipientName}
                      onChange={(e) => setOrgScheduleForm({ ...orgScheduleForm, recipientName: e.target.value })}
                      placeholder="Enter recipient name"
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={orgScheduleForm.frequency}
                    onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setOrgScheduleForm({ ...orgScheduleForm, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={String(orgScheduleForm.timeOfDay)}
                    onValueChange={(v) => setOrgScheduleForm({ ...orgScheduleForm, timeOfDay: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {orgScheduleForm.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(orgScheduleForm.dayOfWeek)}
                    onValueChange={(v) => setOrgScheduleForm({ ...orgScheduleForm, dayOfWeek: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {orgScheduleForm.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select
                    value={String(orgScheduleForm.dayOfMonth)}
                    onValueChange={(v) => setOrgScheduleForm({ ...orgScheduleForm, dayOfMonth: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Case Status</Label>
                <Select
                  value={orgScheduleForm.caseStatusFilter}
                  onValueChange={(v: 'active' | 'all' | 'closed') => setOrgScheduleForm({ ...orgScheduleForm, caseStatusFilter: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Cases Only</SelectItem>
                    <SelectItem value="all">All Cases</SelectItem>
                    <SelectItem value="closed">Closed Cases Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIncludeCaseSummary"
                  checked={orgScheduleForm.includeCaseSummary}
                  onCheckedChange={(checked) => setOrgScheduleForm({ ...orgScheduleForm, includeCaseSummary: checked })}
                />
                <Label htmlFor="editIncludeCaseSummary">Include Case Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIncludeActivityReport"
                  checked={orgScheduleForm.includeActivityReport}
                  onCheckedChange={(checked) => setOrgScheduleForm({ ...orgScheduleForm, includeActivityReport: checked })}
                />
                <Label htmlFor="editIncludeActivityReport">Include Activity Report (Messages)</Label>
              </div>
              
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Switch
                  id="editReportEnabled"
                  checked={orgScheduleForm.enabled}
                  onCheckedChange={(checked) => setOrgScheduleForm({ ...orgScheduleForm, enabled: checked })}
                />
                <Label htmlFor="editReportEnabled" className="font-medium">
                  Report Enabled
                </Label>
                <span className="text-xs text-muted-foreground ml-2">
                  {orgScheduleForm.enabled ? '(Report will be sent on schedule)' : '(Report is paused)'}
                </span>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowEditOrgReportForm(false);
                  setEditingOrgReport(null);
                  if (editingFromReportsTab) {
                    setShowOrgReportsDialog(false);
                    setSelectedOrgForReports(null);
                    setEditingFromReportsTab(false);
                  }
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editingOrgReport) return;
                    updateScheduledReportMutation.mutate({
                      reportId: editingOrgReport.id,
                      data: {
                        recipientEmail: orgScheduleForm.recipientEmail || null,
                        recipientName: orgScheduleForm.recipientName || null,
                        frequency: orgScheduleForm.frequency,
                        dayOfWeek: orgScheduleForm.frequency === 'weekly' ? orgScheduleForm.dayOfWeek : null,
                        dayOfMonth: orgScheduleForm.frequency === 'monthly' ? orgScheduleForm.dayOfMonth : null,
                        timeOfDay: orgScheduleForm.timeOfDay,
                        includeCaseSummary: orgScheduleForm.includeCaseSummary,
                        includeActivityReport: orgScheduleForm.includeActivityReport,
                        caseStatusFilter: orgScheduleForm.caseStatusFilter,
                        enabled: orgScheduleForm.enabled,
                      }
                    });
                  }}
                  disabled={updateScheduledReportMutation.isPending}
                  className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                >
                  {updateScheduledReportMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog - Multi-Organisation Management */}
      <Dialog open={showAssignUser} onOpenChange={setShowAssignUser}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Organisation Assignments</DialogTitle>
            <DialogDescription>
              Manage {selectedUser?.firstName} {selectedUser?.lastName}'s organisation assignments
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Show current assignments */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Assignments:</Label>
              <div className="space-y-2">
                {/* Legacy organisation (from organisationId field) */}
                {selectedUser?.organisationName && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge variant="outline" className="mr-2">
                      {selectedUser.organisationName} (legacy)
                    </Badge>
                    <span className="text-xs text-gray-500">Primary organisation</span>
                  </div>
                )}
                {/* Additional organisations (from junction table) */}
                {(selectedUser as any)?.organisations?.map((org: Organisation) => (
                  <div key={org.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{org.name}</Badge>
                      {org.externalRef && (
                        <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        const confirmation = confirm(`Remove ${selectedUser?.firstName} ${selectedUser?.lastName} from ${org.name}?`);
                        if (confirmation) {
                          removeUserFromOrgMutation.mutate({
                            userId: selectedUser!.id,
                            organisationId: org.id
                          });
                        }
                      }}
                      disabled={removeUserFromOrgMutation.isPending}
                      title={`Remove from ${org.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {!selectedUser?.organisationName && !(selectedUser as any)?.organisations?.length && (
                  <div className="p-2 bg-gray-50 rounded text-center text-gray-500">
                    No organisation assignments
                  </div>
                )}
              </div>
            </div>

            {/* Add to new organisation */}
            <div className="space-y-2">
              <Label htmlFor="newOrganisation" className="text-sm font-medium">Add to Organisation:</Label>
              <Popover open={orgAssignPopoverOpen} onOpenChange={setOrgAssignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgAssignPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedOrgId && selectedOrgId !== "none"
                      ? organisations?.find((org: Organisation) => org.id.toString() === selectedOrgId)?.name
                      : "Search and select organisation..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search organisations..." />
                    <CommandList>
                      <CommandEmpty>No organisation found.</CommandEmpty>
                      <CommandGroup>
                        {organisations?.filter((org: Organisation) => {
                          // Filter out already assigned organisations
                          const currentOrgIds = (selectedUser as any)?.organisations?.map((o: Organisation) => o.id) || [];
                          return !currentOrgIds.includes(org.id) && org.id !== selectedUser?.organisationId;
                        }).map((org: Organisation) => (
                          <CommandItem
                            key={org.id}
                            value={`${org.name} ${org.externalRef || ''}`}
                            onSelect={() => {
                              setSelectedOrgId(org.id.toString());
                              setOrgAssignPopoverOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{org.name}</span>
                              {org.externalRef && (
                                <span className="text-xs text-muted-foreground">Ref: {org.externalRef}</span>
                              )}
                            </div>
                            {selectedOrgId === org.id.toString() && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignUser(false);
                setSelectedOrgId("none");
                setOrgAssignPopoverOpen(false);
              }}
              disabled={addUserToOrgMutation.isPending || removeUserFromOrgMutation.isPending}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && selectedOrgId) {
                  const selectedOrg = organisations?.find(org => org.id.toString() === selectedOrgId);
                  const confirmMessage = `Add ${selectedUser.firstName} ${selectedUser.lastName} to ${selectedOrg?.name}${selectedOrg?.externalRef ? ` (Ref: ${selectedOrg.externalRef})` : ''}?`;
                  
                  if (confirm(confirmMessage)) {
                    addUserToOrgMutation.mutate({
                      userId: selectedUser.id,
                      organisationId: parseInt(selectedOrgId),
                    });
                    setSelectedOrgId("");
                  }
                }
              }}
              disabled={addUserToOrgMutation.isPending || !selectedOrgId}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {addUserToOrgMutation.isPending ? "Adding..." : "Add to Organisation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Created</DialogTitle>
            <DialogDescription>
              Please provide this temporary password to the user. They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono bg-gray-50"
                  placeholder={!tempPassword ? "Loading..." : ""}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tempPassword)}
                  disabled={!tempPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {tempPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  Password length: {tempPassword.length} characters
                </p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  This password will only be shown once. Make sure to copy it and provide it to the user securely.
                </p>
              </div>
            </div>

            {createdUserId && isNewUserFlow && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-700 mb-3">
                  <strong>Send Welcome Emails</strong><br />
                  Click below to send two emails to the user:
                </p>
                <ul className="text-sm text-blue-600 mb-3 ml-4 list-disc">
                  <li>Welcome email with portal link</li>
                  <li>Separate email with temporary password</li>
                </ul>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> The user must be assigned to an organisation before sending welcome emails. Close this dialog and assign them first if needed.
                  </p>
                </div>
                <Button
                  onClick={handleSendWelcomeEmail}
                  disabled={sendingWelcomeEmail || !tempPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {sendingWelcomeEmail ? (
                    <>
                      <Mail className="h-4 w-4 mr-2 animate-pulse" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Welcome Emails
                    </>
                  )}
                </Button>
              </div>
            )}

            {createdUserId && !isNewUserFlow && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-700 mb-3">
                  <strong>Send Password Email</strong><br />
                  Click below to email the new temporary password to the user.
                </p>
                <Button
                  onClick={handleSendPasswordEmail}
                  disabled={sendingPasswordEmail || !tempPassword}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {sendingPasswordEmail ? (
                    <>
                      <Mail className="h-4 w-4 mr-2 animate-pulse" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Password Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => {
              setShowPasswordDialog(false);
              setCreatedUserId(null);
              setIsNewUserFlow(false);
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduled Report Configuration Dialog */}
      <Dialog open={showScheduledReportDialog} onOpenChange={(open) => {
        setShowScheduledReportDialog(open);
        if (!open) {
          setShowReportEditForm(false);
          setEditingReportId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Scheduled Reports</DialogTitle>
            <DialogDescription>
              Manage scheduled email reports for {scheduledReportUser?.firstName} {scheduledReportUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {!showReportEditForm ? (
            <div className="py-4">
              {/* List of existing reports */}
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {scheduledReportUser && scheduledReportsMap[scheduledReportUser.id]?.length > 0 ? (
                  scheduledReportsMap[scheduledReportUser.id].map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {report.organisationId ? getOrgName(report.organisationId) : "Combined Report"}
                          </span>
                          {report.enabled ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {report.frequency}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {report.enabled ? (
                            <>
                              {report.frequency === "daily" ? "Every day" : 
                               report.frequency === "weekly" ? `Every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][report.dayOfWeek || 0]}` :
                               `Day ${report.dayOfMonth || 1} of each month`}
                              {" at "}
                              {report.timeOfDay === 0 ? "12:00 AM" : 
                               report.timeOfDay > 12 ? `${report.timeOfDay - 12}:00 PM` : 
                               report.timeOfDay === 12 ? "12:00 PM" : `${report.timeOfDay}:00 AM`}
                            </>
                          ) : "Report is disabled"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedReportForAudit(report);
                            setShowReportAuditDialog(true);
                          }}
                          title="View audit logs"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => sendTestReportMutation.mutate(report.id)}
                          disabled={sendTestReportMutation.isPending}
                          title="Send test report"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditReportForm(report)}
                          title="Edit report"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteScheduledReportMutation.mutate(report.id)}
                          disabled={deleteScheduledReportMutation.isPending}
                          className="text-red-500 hover:text-red-700"
                          title="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No scheduled reports configured</p>
                    <p className="text-xs mt-1">Add a report to send periodic email summaries</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowScheduledReportDialog(false)}>
                  Close
                </Button>
                <Button onClick={openNewReportForm} className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Organisation selection for new reports */}
              {editingReportId === null && (
                <div className="space-y-2">
                  <Label className="font-medium">Report Scope</Label>
                  <Select 
                    value={scheduledReportOrgId === null ? "combined" : String(scheduledReportOrgId)} 
                    onValueChange={(v) => setScheduledReportOrgId(v === "combined" ? null : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organisation or combined" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">All Organisations (Combined Report)</SelectItem>
                      {scheduledReportUser && getUserOrganisations(scheduledReportUser as any).map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Choose a specific organisation or create a combined report for all
                  </p>
                </div>
              )}

              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sr-enabled" className="font-medium">
                    Enable Report
                  </Label>
                  <p className="text-sm text-gray-500">Send reports on schedule</p>
                </div>
                <Checkbox
                  id="sr-enabled"
                  checked={scheduledReportEnabled}
                  onCheckedChange={(checked) => setScheduledReportEnabled(checked === true)}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Frequency</Label>
                <Select value={scheduledReportFrequency} onValueChange={(v: "daily" | "weekly" | "monthly") => setScheduledReportFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Time of Day</Label>
                <Select value={String(scheduledReportTimeOfDay)} onValueChange={(v) => setScheduledReportTimeOfDay(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i;
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const period = hour < 12 ? 'AM' : 'PM';
                      return (
                        <SelectItem key={hour} value={String(hour)}>
                          {displayHour}:00 {period}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {scheduledReportFrequency === "weekly" && (
                <div className="space-y-2">
                  <Label className="font-medium">Day of Week</Label>
                  <Select value={String(scheduledReportDayOfWeek)} onValueChange={(v) => setScheduledReportDayOfWeek(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scheduledReportFrequency === "monthly" && (
                <div className="space-y-2">
                  <Label className="font-medium">Day of Month</Label>
                  <Select value={String(scheduledReportDayOfMonth)} onValueChange={(v) => setScheduledReportDayOfMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label className="font-medium">Report Contents</Label>
                
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium">Case Summary</span>
                    <p className="text-xs text-gray-500">Case name, account number, debtor, status, amounts</p>
                  </div>
                  <Checkbox
                    checked={scheduledReportCaseSummary}
                    onCheckedChange={(checked) => setScheduledReportCaseSummary(checked === true)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium">Messages Report</span>
                    <p className="text-xs text-gray-500">All messages received during the period</p>
                  </div>
                  <Checkbox
                    checked={scheduledReportActivity}
                    onCheckedChange={(checked) => setScheduledReportActivity(checked === true)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Include Cases</Label>
                <Select value={scheduledReportCaseFilter} onValueChange={(v: "active" | "all" | "closed") => setScheduledReportCaseFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active cases only</SelectItem>
                    <SelectItem value="all">All cases</SelectItem>
                    <SelectItem value="closed">Closed cases only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowReportEditForm(false);
                  if (editingFromReportsTab) {
                    setShowScheduledReportDialog(false);
                    setScheduledReportUser(null);
                    setEditingFromReportsTab(false);
                  }
                }}>
                  {editingFromReportsTab ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={() => {
                    if (scheduledReportUser) {
                      const reportData = {
                        organisationId: scheduledReportOrgId,
                        enabled: scheduledReportEnabled,
                        frequency: scheduledReportFrequency,
                        dayOfWeek: scheduledReportDayOfWeek,
                        dayOfMonth: scheduledReportDayOfMonth,
                        timeOfDay: scheduledReportTimeOfDay,
                        includeCaseSummary: scheduledReportCaseSummary,
                        includeActivityReport: scheduledReportActivity,
                        caseStatusFilter: scheduledReportCaseFilter,
                      };
                      
                      if (editingReportId !== null) {
                        updateScheduledReportMutation.mutate({ reportId: editingReportId, data: reportData });
                      } else {
                        createScheduledReportMutation.mutate({ userId: scheduledReportUser.id, data: reportData });
                      }
                    }
                  }}
                  disabled={createScheduledReportMutation.isPending || updateScheduledReportMutation.isPending}
                  className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                >
                  {(createScheduledReportMutation.isPending || updateScheduledReportMutation.isPending) 
                    ? "Saving..." 
                    : editingReportId !== null ? "Update Report" : "Create Report"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Audit Logs Dialog */}
      <Dialog open={showReportAuditDialog} onOpenChange={(open) => {
        setShowReportAuditDialog(open);
        if (!open) setSelectedReportForAudit(null);
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Report #{selectedReportForAudit?.id} Audit Logs</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm truncate">
              {selectedReportForAudit?.recipientEmail || selectedReportForAudit?.userEmail}
              {selectedReportForAudit?.recipientName && ` (${selectedReportForAudit.recipientName})`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 sm:space-y-3">
            {reportAuditLogsLoading ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">Loading audit logs...</div>
            ) : reportAuditLogs.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <History className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm">No audit logs found for this report</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reportAuditLogs.map((log: any) => (
                  <div key={log.id} className={`border rounded-lg p-2 sm:p-3 text-xs sm:text-sm ${
                    log.operation === 'SEND' ? 'border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800' :
                    log.operation === 'SKIP' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800' :
                    log.operation === 'ERROR' ? 'border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800' :
                    'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <Badge variant={
                          log.operation === 'SEND' ? 'default' :
                          log.operation === 'SKIP' ? 'secondary' :
                          log.operation === 'ERROR' ? 'destructive' :
                          'outline'
                        } className={`text-xs ${
                          log.operation === 'SEND' ? 'bg-green-600' :
                          log.operation === 'SKIP' ? 'bg-amber-500 text-white' :
                          ''
                        }`}>
                          {log.operation}
                        </Badge>
                        <span className="text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 break-words">{log.description}</p>
                      {log.newValue && (
                        <div className="text-xs text-gray-500">
                          {(() => {
                            try {
                              const data = JSON.parse(log.newValue);
                              if (data.reason) {
                                return (
                                  <span className="inline-flex flex-wrap items-center gap-1">
                                    <span className="font-medium">Reason:</span>
                                    <span className="break-words">
                                      {data.reason === 'no_messages' ? 'No new messages to include' :
                                       data.reason === 'user_not_activated' ? 'User has not completed first login' :
                                       data.reason === 'organisations_disabled' ? 'Scheduled reports disabled for organisations' :
                                       data.reason}
                                    </span>
                                  </span>
                                );
                              }
                              return null;
                            } catch {
                              return null;
                            }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReportAuditDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}