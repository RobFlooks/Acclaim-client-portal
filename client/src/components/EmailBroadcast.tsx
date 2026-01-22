import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  Send,
  Users,
  Building2,
  ShieldCheck,
  Zap,
  Eye,
  Loader2,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  mustChangePassword?: boolean;
  organisationIds?: number[];
}

interface Organisation {
  id: number;
  name: string;
}

interface UsersWithOrgsResponse {
  users: User[];
  organisations: Organisation[];
}

interface QuickTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const quickTemplates: QuickTemplate[] = [
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance',
    subject: 'Acclaim Portal - Scheduled Maintenance Notice',
    body: `Dear User,

We would like to inform you that the Acclaim Portal will undergo scheduled maintenance on [DATE] between [START TIME] and [END TIME].

During this period, the portal may be temporarily unavailable. We apologise for any inconvenience this may cause.

If you have any urgent matters, please contact us at email@acclaim.law.

Kind regards,
The Acclaim Team`,
  },
  {
    id: 'update',
    name: 'System Update',
    subject: 'Acclaim Portal - System Update Notification',
    body: `Dear User,

We are pleased to announce that the Acclaim Portal has been updated with new features and improvements.

Key updates include:
• [Feature 1]
• [Feature 2]
• [Feature 3]

Please log in to explore the new functionality. If you have any questions, don't hesitate to reach out.

Kind regards,
The Acclaim Team`,
  },
  {
    id: 'security',
    name: 'Security Notice',
    subject: 'Acclaim Portal - Important Security Notice',
    body: `Dear User,

This is an important security notice regarding your Acclaim Portal account.

[SECURITY MESSAGE]

If you have any concerns or notice any suspicious activity, please contact us immediately at email@acclaim.law.

Kind regards,
The Acclaim Team`,
  },
  {
    id: 'general',
    name: 'General Announcement',
    subject: 'Acclaim Portal - Important Announcement',
    body: `Dear User,

[YOUR MESSAGE HERE]

If you have any questions, please don't hesitate to contact us.

Kind regards,
The Acclaim Team`,
  },
];

export function EmailBroadcast() {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  const [selectAllUsers, setSelectAllUsers] = useState(false);
  const [selectAllAdmins, setSelectAllAdmins] = useState(false);
  const [selectAllSuperAdmins, setSelectAllSuperAdmins] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');

  const { data: usersData } = useQuery<UsersWithOrgsResponse>({
    queryKey: ['/api/admin/users/with-organisations'],
  });

  const users = usersData?.users || [];
  const organisations = usersData?.organisations || [];

  const sendBroadcastMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; recipientIds: string[] }) => {
      const response = await apiRequest('POST', '/api/admin/email-broadcast', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Broadcast Sent',
        description: `Email successfully sent to ${data.sentCount} recipient(s).`,
      });
      setSubject('');
      setBody('');
      setSelectedTemplate('');
      setSelectAllUsers(false);
      setSelectAllAdmins(false);
      setSelectAllSuperAdmins(false);
      setSelectedOrgs([]);
      setSelectedIndividuals([]);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send',
        description: error.message || 'An error occurred while sending the broadcast.',
        variant: 'destructive',
      });
    },
  });

  const activeUsers = useMemo(() => {
    return users.filter((u) => !u.mustChangePassword && u.email);
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return activeUsers;
    const term = userSearchTerm.toLowerCase();
    return activeUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term)
    );
  }, [activeUsers, userSearchTerm]);

  const filteredOrgs = useMemo(() => {
    if (!orgSearchTerm) return organisations;
    const term = orgSearchTerm.toLowerCase();
    return organisations.filter((o) => o.name.toLowerCase().includes(term));
  }, [organisations, orgSearchTerm]);

  const selectedRecipients = useMemo(() => {
    const recipientSet = new Set<string>();

    if (selectAllUsers) {
      activeUsers.forEach((u) => recipientSet.add(u.id));
    }

    if (selectAllAdmins) {
      activeUsers.filter((u) => u.isAdmin).forEach((u) => recipientSet.add(u.id));
    }

    if (selectAllSuperAdmins) {
      activeUsers.filter((u) => u.isSuperAdmin).forEach((u) => recipientSet.add(u.id));
    }

    if (selectedOrgs.length > 0) {
      activeUsers.forEach((u) => {
        const userOrgIds = u.organisationIds || [];
        if (userOrgIds.some((orgId) => selectedOrgs.includes(orgId))) {
          recipientSet.add(u.id);
        }
      });
    }

    selectedIndividuals.forEach((id) => recipientSet.add(id));

    return Array.from(recipientSet);
  }, [selectAllUsers, selectAllAdmins, selectAllSuperAdmins, selectedOrgs, selectedIndividuals, activeUsers]);

  const recipientEmails = useMemo(() => {
    return selectedRecipients
      .map((id) => activeUsers.find((u) => u.id === id))
      .filter((u) => u?.email)
      .map((u) => u!.email);
  }, [selectedRecipients, activeUsers]);

  const recipientDetails = useMemo(() => {
    return selectedRecipients
      .map((id) => activeUsers.find((u) => u.id === id))
      .filter((u): u is User => !!u && !!u.email)
      .sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [selectedRecipients, activeUsers]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = quickTemplates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const toggleOrg = (orgId: number) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const toggleIndividual = (userId: string) => {
    setSelectedIndividuals((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: 'Missing Content',
        description: 'Please enter both a subject and message.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one recipient.',
        variant: 'destructive',
      });
      return;
    }

    // Force preview before sending
    setShowPreview(true);
  };

  const confirmSend = () => {
    setShowConfirmSend(false);
    setShowPreview(false);
    sendBroadcastMutation.mutate({
      subject,
      body,
      recipientIds: selectedRecipients,
    });
  };

  const handleEditRecipients = () => {
    setShowPreview(false);
    // Scroll to recipients section
    setTimeout(() => {
      document.getElementById('recipients-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg flex-shrink-0">
              <Mail className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Email Broadcast</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Send emails to users, organisations, or admins. All recipients are BCC'd for data protection.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick Templates
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select a template to pre-fill the email, then edit as needed.
                </p>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quickTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter your message..."
                  className="mt-1 min-h-[250px] font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div id="recipients-section">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Recipients
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select who should receive this email.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectAllUsers
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectAllUsers(!selectAllUsers)}
                    >
                      <Checkbox checked={selectAllUsers} />
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium whitespace-nowrap">All Users</span>
                      <Badge variant="secondary" className="ml-auto">
                        {activeUsers.length}
                      </Badge>
                    </div>

                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectAllAdmins
                          ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectAllAdmins(!selectAllAdmins)}
                    >
                      <Checkbox checked={selectAllAdmins} />
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium whitespace-nowrap">All Admins</span>
                      <Badge variant="secondary" className="ml-auto">
                        {activeUsers.filter((u) => u.isAdmin).length}
                      </Badge>
                    </div>

                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectAllSuperAdmins
                          ? 'bg-fuchsia-50 border-fuchsia-300 dark:bg-fuchsia-900/30 dark:border-fuchsia-700'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectAllSuperAdmins(!selectAllSuperAdmins)}
                    >
                      <Checkbox checked={selectAllSuperAdmins} />
                      <ShieldCheck className="h-4 w-4 text-fuchsia-600 flex-shrink-0" />
                      <span className="text-sm font-medium whitespace-nowrap">Admin+</span>
                      <Badge variant="secondary" className="ml-auto">
                        {activeUsers.filter((u) => u.isSuperAdmin).length}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4" />
                      By Organisation
                    </Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search organisations..."
                        value={orgSearchTerm}
                        onChange={(e) => setOrgSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <ScrollArea className="h-[100px] border rounded-md p-2">
                      <div className="space-y-1">
                        {filteredOrgs.map((org) => (
                          <div
                            key={org.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                              selectedOrgs.includes(org.id)
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleOrg(org.id)}
                          >
                            <Checkbox checked={selectedOrgs.includes(org.id)} />
                            <span className="truncate">{org.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-sm flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      Individual Users
                    </Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <ScrollArea className="h-[140px] border rounded-md p-2">
                      <div className="space-y-1">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-sm ${
                              selectedIndividuals.includes(user.id)
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleIndividual(user.id)}
                          >
                            <Checkbox checked={selectedIndividuals.includes(user.id)} className="flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">
                                  {user.firstName} {user.lastName}
                                </span>
                                {user.isSuperAdmin && (
                                  <Badge className="flex-shrink-0 bg-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300 text-[10px] px-1">
                                    Admin+
                                  </Badge>
                                )}
                                {user.isAdmin && !user.isSuperAdmin && (
                                  <Badge className="flex-shrink-0 bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] px-1">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground truncate text-xs block">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Recipients:</span>
                  <Badge variant="default" className="bg-acclaim-teal">
                    {selectedRecipients.length} user(s)
                  </Badge>
                </div>
                {selectedRecipients.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Emails will be sent via BCC - recipients cannot see each other's addresses.
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              onClick={handleSend}
              disabled={sendBroadcastMutation.isPending || selectedRecipients.length === 0 || !subject.trim() || !body.trim()}
              className="bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {sendBroadcastMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview &amp; Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review &amp; Send Email
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please review the recipients and email content before sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground uppercase">Recipients ({recipientDetails.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditRecipients}
                  className="h-7 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Edit Recipients
                </Button>
              </div>
              <ScrollArea className="h-[150px] border rounded-md p-2 bg-gray-50 dark:bg-gray-900">
                <div className="space-y-1">
                  {recipientDetails.map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground block truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>
                      {user.isSuperAdmin && (
                        <Badge className="flex-shrink-0 bg-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300 text-[10px] px-1 ml-2">
                          Admin+
                        </Badge>
                      )}
                      {user.isAdmin && !user.isSuperAdmin && (
                        <Badge className="flex-shrink-0 bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] px-1 ml-2">
                          Admin
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                Emails sent via BCC - recipients cannot see each other's addresses.
              </p>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Subject</Label>
              <p className="font-medium break-words mt-1">{subject}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Message</Label>
              <div className="bg-white dark:bg-gray-900 border rounded-lg p-3 sm:p-4 mt-1">
                <pre className="whitespace-pre-wrap font-sans text-sm break-words">{body}</pre>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <Button
              onClick={confirmSend}
              disabled={sendBroadcastMutation.isPending}
              className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {sendBroadcastMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm &amp; Send ({recipientDetails.length})
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
