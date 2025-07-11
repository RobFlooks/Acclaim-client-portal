import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, MessageSquare, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function Messages() {
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages"],
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
        description: "Failed to load messages",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      setNewSubject("");
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "Message sent successfully",
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !newSubject.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    let messageContent = newMessage;
    
    // If this is a reply, include the original message
    if (replyingTo) {
      const fromName = replyingTo.senderName || replyingTo.senderEmail || replyingTo.senderId;
      messageContent = `${newMessage}\n\n--- Original Message ---\nFrom: ${fromName}\nDate: ${formatDate(replyingTo.createdAt)}\nSubject: ${replyingTo.subject}\n\n${replyingTo.content}`;
    }

    sendMessageMutation.mutate({
      recipientType: "organization",
      recipientId: "support",
      subject: newSubject,
      content: messageContent,
    });
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    setNewSubject(`Re: ${message.subject}`);
    setNewMessage("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setReplyingTo(null);
    setNewMessage("");
    setNewSubject("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with New Message Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Messages</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {replyingTo ? `Reply to: ${replyingTo.subject}` : "Send New Message"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter message subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    />
                  </div>
                  {replyingTo && (
                    <div className="p-3 bg-gray-50 rounded border-l-4 border-acclaim-teal">
                      <p className="text-sm font-medium text-gray-700 mb-1">Original Message:</p>
                      <p className="text-sm text-gray-600">{replyingTo.content}</p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !newSubject.trim() || sendMessageMutation.isPending}
                    className="w-full bg-acclaim-teal hover:bg-acclaim-teal/90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Messages ({messages?.length || 0})</CardTitle>
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
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    message.isRead 
                      ? "bg-gray-50 border-gray-200" 
                      : "bg-white border-acclaim-teal shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-acclaim-teal bg-opacity-10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-acclaim-teal" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">{message.subject}</p>
                          {!message.isRead && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">
                            From: {message.senderName || message.senderEmail || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">{message.content}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{formatDate(message.createdAt)}</p>
                          {message.caseId && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">Related to case</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-acclaim-teal hover:text-acclaim-teal"
                      onClick={() => handleReply(message)}
                      title="Reply to this message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No messages found</p>
              <p className="text-sm text-gray-400 mt-2">
                Start a conversation with our team using the "New Message" button above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
