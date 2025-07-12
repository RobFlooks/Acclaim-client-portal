import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, User, Building, Factory, Clock, Check, AlertTriangle, Eye, UserCog, Users, Store, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import CaseDetail from "./CaseDetail";

export default function Cases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: cases, isLoading } = useQuery({
    queryKey: ["/api/cases"],
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

  const filteredCases = cases?.filter((case_: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      case_.debtorName.toLowerCase().includes(searchLower) ||
      case_.accountNumber.toLowerCase().includes(searchLower) ||
      case_.debtorEmail?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatusBadge = (status: string, stage: string) => {
    if (status === "resolved" || status?.toLowerCase() === "closed") {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Closed</Badge>;
    }
    
    // Normalize stage for comparison
    const normalizedStage = stage?.toLowerCase().replace(/[_-]/g, '');
    
    switch (normalizedStage) {
      case "paymentplan":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Payment Plan</Badge>;
      case "legalaction":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Legal Action</Badge>;
      case "prelegal":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Pre-Legal</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
    }
  };

  const getDebtorIcon = (debtorType: string) => {
    switch (debtorType) {
      case 'individual':
        return <User className="text-acclaim-teal h-5 w-5" />;
      case 'company':
        return <Building className="text-acclaim-teal h-5 w-5" />;
      case 'sole_trader':
        return <Store className="text-acclaim-teal h-5 w-5" />;
      case 'company_and_individual':
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by debtor name, account number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>
      {/* Cases List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.isAdmin ? `All Cases - Global View (${filteredCases.length})` : `All Cases (${filteredCases.length})`}
          </CardTitle>
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
          ) : filteredCases.length > 0 ? (
            <div className="space-y-4">
              {filteredCases.map((case_: any) => (
                <div
                  key={case_.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#f9fafb]">
                      {getDebtorIcon(case_.debtorType)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{case_.debtorName}</p>
                      <p className="text-sm text-gray-600">Account: {case_.accountNumber}</p>
                      {user?.isAdmin && case_.organisationName && (
                        <p className="text-sm text-blue-600 font-medium">
                          <Building className="inline w-3 h-3 mr-1" />
                          {case_.organisationName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Created: {formatDate(case_.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Outstanding Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(case_.outstandingAmount)}
                    </p>
                    <p className="text-xs text-gray-500">*May include interest and costs</p>
                  </div>
                  
                  <div className="text-center">
                    {getStatusBadge(case_.status, case_.stage)}
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
                        className="ml-4"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
                      <DialogHeader>
                        <DialogTitle>Case Details - {case_.debtorName}</DialogTitle>
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
                {searchTerm ? "No cases match your search" : "No cases found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
