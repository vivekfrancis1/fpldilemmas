import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminGoalProjectionsSimple() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Goal Projection Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure team assignments and projection parameters for goal forecasting.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Admin Page</CardTitle>
          <CardDescription>
            This is a simplified test version of the admin page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Test Button</Button>
          <p>If you can see this, the basic routing is working.</p>
        </CardContent>
      </Card>
    </div>
  );
}