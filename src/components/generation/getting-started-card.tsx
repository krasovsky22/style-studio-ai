import { Separator } from "@radix-ui/react-dropdown-menu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";

const GettingStartedCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>
          Follow these steps to generate your first AI fashion image
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
              1
            </div>
            <div>
              <h4 className="font-medium">Upload Product Image</h4>
              <p className="text-muted-foreground text-sm">
                Add a clear image of your clothing item
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
              2
            </div>
            <div>
              <h4 className="font-medium">Choose Style & Settings</h4>
              <p className="text-muted-foreground text-sm">
                Select your preferred style and quality settings
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
              3
            </div>
            <div>
              <h4 className="font-medium">Generate & Download</h4>
              <p className="text-muted-foreground text-sm">
                AI will create your fashion visualization
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium">Tips for Best Results</h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>• Use high-quality, well-lit product images</li>
            <li>• Try different styles to see various looks</li>
            <li>• Higher quality settings produce better results</li>
            <li>• Add custom prompts for specific requirements</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GettingStartedCard;
