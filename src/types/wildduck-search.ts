import type {
  WildduckMessageListItem,
  WildduckSearchMessagesRequest,
} from "@sudobility/mail_box_types";

export type WildduckSearchQueryParams = Omit<
  Partial<WildduckSearchMessagesRequest>,
  "q" | "sess" | "ip" | "includeHeaders"
> & {
  includeHeaders?: string | string[];
  page?: number;
};

export interface WildduckSearchMessagesResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: WildduckMessageListItem[];
}
