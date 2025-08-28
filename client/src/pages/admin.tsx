import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Save, X, Users, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ContentCreator {
  id: number;
  name: string;
  managerId: number;
  managerName: string;
  playerName: string;
  description: string;
  twitterHandle: string | null;
  youtubeUrl: string | null;
  followers: number | null;
  isActive: boolean;
  addedDate: string;
  lastUpdated: string;
}

interface NewCreatorForm {
  name: string;
  managerId: string;
  description: string;
  twitterHandle: string;
  youtubeUrl: string;
}



export default function Admin() {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContentCreator>>({});
  const [newCreatorForm, setNewCreatorForm] = useState<NewCreatorForm>({
    name: "",
    managerId: "",
    description: "",
    twitterHandle: "",
    youtubeUrl: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: creators = [], isLoading } = useQuery<ContentCreator[]>({
    queryKey: ["/api/content-creators"],
  });

  // Debug: Log the FPL Harry data to console
  const fplHarry = creators.find(c => c.name === "FPL Harry");
  if (fplHarry) {
    console.log("FPL Harry data:", fplHarry);
  }

  const addCreatorMutation = useMutation({
    mutationFn: async (newCreator: any) => {
      return apiRequest("POST", "/api/content-creators", {
        name: newCreator.name,
        managerId: parseInt(newCreator.managerId),
        description: newCreator.description,
        twitterHandle: newCreator.twitterHandle || null,
        youtubeUrl: newCreator.youtubeUrl || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-creators"] });
      setIsAddingNew(false);
      setNewCreatorForm({
        name: "",
        managerId: "",
        description: "",
        twitterHandle: "",
        youtubeUrl: ""
      });
      toast({
        title: "Success",
        description: "Content creator added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add content creator",
        variant: "destructive",
      });
    },
  });

  const updateCreatorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ContentCreator> }) => {
      return apiRequest("PUT", `/api/content-creators/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-creators"] });
      setEditingId(null);
      setEditForm({});
      toast({
        title: "Success",
        description: "Content creator updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update content creator",
        variant: "destructive",
      });
    },
  });

  const handleAddCreator = () => {
    if (!newCreatorForm.name || !newCreatorForm.managerId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name and Manager ID)",
        variant: "destructive",
      });
      return;
    }

    addCreatorMutation.mutate(newCreatorForm);
  };

  const handleEditCreator = (creator: ContentCreator) => {
    setEditingId(creator.id);
    setEditForm({
      name: creator.name,
      managerId: creator.managerId,
      description: creator.description,
      twitterHandle: creator.twitterHandle,
      youtubeUrl: creator.youtubeUrl
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      const updates = {
        ...editForm,
        managerId: typeof editForm.managerId === 'string' ? parseInt(editForm.managerId as string) : editForm.managerId
      };
      updateCreatorMutation.mutate({ id: editingId, updates });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold">FPL Content Creators Admin</h1>
            <p className="text-muted-foreground">Manage content creators, their details, and Manager IDs</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <Badge variant="secondary">{creators.length} Creators</Badge>
        </div>
      </div>

      {/* Add New Creator Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add New Content Creator</span>
              </CardTitle>
              <CardDescription>Add a new FPL content creator to track</CardDescription>
            </div>
            <Button
              onClick={() => setIsAddingNew(!isAddingNew)}
              variant={isAddingNew ? "outline" : "default"}
              data-testid="button-toggle-add-creator"
            >
              {isAddingNew ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isAddingNew ? "Cancel" : "Add Creator"}
            </Button>
          </div>
        </CardHeader>
        {isAddingNew && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="e.g., FPL Harry"
                  value={newCreatorForm.name}
                  onChange={(e) => setNewCreatorForm({ ...newCreatorForm, name: e.target.value })}
                  data-testid="input-creator-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Manager ID *</label>
                <Input
                  type="number"
                  placeholder="e.g., 1320"
                  value={newCreatorForm.managerId}
                  onChange={(e) => setNewCreatorForm({ ...newCreatorForm, managerId: e.target.value })}
                  data-testid="input-creator-manager-id"
                />
              </div>



              <div>
                <label className="text-sm font-medium">Twitter Handle</label>
                <Input
                  placeholder="e.g., @FPL_Harry"
                  value={newCreatorForm.twitterHandle}
                  onChange={(e) => setNewCreatorForm({ ...newCreatorForm, twitterHandle: e.target.value })}
                  data-testid="input-creator-twitter-handle"
                />
              </div>
              <div>
                <label className="text-sm font-medium">YouTube URL</label>
                <Input
                  placeholder="e.g., https://youtube.com/@FPLHarry"
                  value={newCreatorForm.youtubeUrl}
                  onChange={(e) => setNewCreatorForm({ ...newCreatorForm, youtubeUrl: e.target.value })}
                  data-testid="input-creator-youtube-url"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of the content creator..."
                value={newCreatorForm.description}
                onChange={(e) => setNewCreatorForm({ ...newCreatorForm, description: e.target.value })}
                rows={3}
                data-testid="textarea-creator-description"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAddCreator}
                disabled={addCreatorMutation.isPending}
                data-testid="button-save-creator"
              >
                {addCreatorMutation.isPending ? "Adding..." : "Add Creator"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Existing Creators List */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Existing Content Creators</h2>
        {creators.map((creator: ContentCreator) => (
          <Card key={creator.id}>
            <CardContent className="p-6">
              {editingId === creator.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        data-testid={`input-edit-name-${creator.id}`}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Manager ID</label>
                      <Input
                        type="number"
                        value={editForm.managerId?.toString() || ""}
                        onChange={(e) => setEditForm({ ...editForm, managerId: parseInt(e.target.value) || 0 })}
                        data-testid={`input-edit-manager-id-${creator.id}`}
                      />
                    </div>



                    <div>
                      <label className="text-sm font-medium">Twitter Handle</label>
                      <Input
                        placeholder="e.g., @FPL_Harry"
                        value={editForm.twitterHandle || ""}
                        onChange={(e) => setEditForm({ ...editForm, twitterHandle: e.target.value })}
                        data-testid={`input-edit-twitter-handle-${creator.id}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">YouTube URL</label>
                      <Input
                        placeholder="e.g., https://youtube.com/@FPLHarry"
                        value={editForm.youtubeUrl || ""}
                        onChange={(e) => setEditForm({ ...editForm, youtubeUrl: e.target.value })}
                        data-testid={`input-edit-youtube-url-${creator.id}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      data-testid={`textarea-edit-description-${creator.id}`}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancelEdit} data-testid={`button-cancel-edit-${creator.id}`}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={updateCreatorMutation.isPending}
                      data-testid={`button-save-edit-${creator.id}`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCreatorMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold" data-testid={`text-creator-name-${creator.id}`}>
                        {creator.name}
                      </h3>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Manager ID:</span>
                        <span className="ml-2" data-testid={`text-manager-id-${creator.id}`}>
                          {creator.managerId}
                        </span>
                      </div>

                    </div>
                    {creator.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-creator-description-${creator.id}`}>
                        {creator.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {creator.twitterHandle && (
                        <div>
                          <span className="font-medium">Twitter:</span>
                          <span className="ml-2 text-blue-600" data-testid={`text-twitter-handle-${creator.id}`}>
                            {creator.twitterHandle}
                          </span>
                        </div>
                      )}
                      {creator.youtubeUrl && (
                        <div>
                          <span className="font-medium">YouTube:</span>
                          <a
                            href={creator.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-red-600 hover:underline"
                            data-testid={`link-youtube-url-${creator.id}`}
                          >
                            Channel
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Added: {new Date(creator.addedDate).toLocaleDateString()} | 
                      Last Updated: {new Date(creator.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCreator(creator)}
                    data-testid={`button-edit-creator-${creator.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}