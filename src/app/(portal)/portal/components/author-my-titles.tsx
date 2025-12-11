import { Book, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthorTitles } from "@/modules/title-authors";

/**
 * Author My Titles Component
 *
 * Displays all titles where the author is listed with ownership percentages.
 * Shows co-authored vs sole author indicator.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * AC-10.1.7: Author View of Co-Authored Titles
 *
 * Requirements:
 * - Author portal shows titles where contact is an author (via title_authors)
 * - Display shows ownership percentage for each title
 * - Titles list indicates "Co-authored" vs. "Sole Author"
 */

interface AuthorMyTitlesProps {
  authorId: string;
}

/**
 * Format ISBN-13 for display with proper hyphenation
 */
function formatIsbn(isbn: string | null): string {
  if (!isbn) return "—";
  const digits = isbn.replace(/[-\s]/g, "");
  if (digits.length !== 13) return isbn;

  // Standard ISBN-13 format: 978-X-XXXXXX-XX-X (assuming 6-digit registrant)
  const gs1 = digits.slice(0, 3);
  const registrationGroup = digits.slice(3, 4);
  const registrant = digits.slice(4, 10);
  const publication = digits.slice(10, 12);
  const checkDigit = digits.slice(12);

  return `${gs1}-${registrationGroup}-${registrant}-${publication}-${checkDigit}`;
}

/**
 * Get badge variant for publication status
 */
function getStatusBadgeVariant(
  status: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "published":
      return "default";
    case "pending":
      return "secondary";
    case "draft":
      return "outline";
    case "out_of_print":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Format publication status for display
 */
function formatStatus(status: string | null): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function AuthorMyTitles({ authorId }: AuthorMyTitlesProps) {
  const titles = await getAuthorTitles(authorId);

  if (titles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            My Titles
          </CardTitle>
          <CardDescription>
            Titles where you are listed as an author
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Book className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No titles found</p>
            <p className="text-xs mt-1">
              Contact your publisher if you believe this is an error.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const soleAuthoredCount = titles.filter((t) => !t.isCoAuthored).length;
  const coAuthoredCount = titles.filter((t) => t.isCoAuthored).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              My Titles
            </CardTitle>
            <CardDescription>
              Titles where you are listed as an author
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{soleAuthoredCount} sole</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{coAuthoredCount} co-authored</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Authorship</TableHead>
              <TableHead className="text-right">Your Ownership</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {titles.map((title) => (
              <TableRow key={title.titleId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{title.title}</span>
                    {title.isPrimary && (
                      <Badge variant="outline" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatIsbn(title.isbn)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusBadgeVariant(title.publicationStatus)}
                  >
                    {formatStatus(title.publicationStatus)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {title.isCoAuthored ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600">
                        Co-authored ({title.coAuthorCount} authors)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Sole Author</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold">
                    {parseFloat(title.ownershipPercentage).toFixed(2)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
