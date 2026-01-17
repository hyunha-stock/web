import {SearchDefault} from "@/domain/stock/types/search-default.model";
import {apiFetchClient} from "@/lib/http/client";
import {SearchDefaultDto} from "@/domain/stock/types/search-default.dto";
import {toSearchDefault} from "@/domain/stock/mappers/search-default.mapper";

export async function fetchSearchDefault(): Promise<SearchDefault> {
  const data = await apiFetchClient<SearchDefaultDto>(
    "/stocks/v1/search/defaults",
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    }
  )
  return toSearchDefault(data);
}