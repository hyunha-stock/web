import {apiFetchClient} from "@/lib/http/client";
import {IndustryIndexItem} from "@/domain/stock/types/industry-index-item.model";
import {IndustryIndexItemDto} from "@/domain/stock/types/industry-index-item.dto";
import {toIndustryIndexItems} from "@/domain/stock/mappers/industry-index-item.mapper";
import {FluctuationOutputDto} from "@/domain/stock/types/fluctuation.dto";
import {toFluctuations} from "@/domain/stock/mappers/fluctuation.mapper";
import {Fluctuation} from "@/domain/stock/types/fluctuation.model";


export async function fetchTopGainers(): Promise<Fluctuation[]> {
  const data = await apiFetchClient<FluctuationOutputDto[]>(
    `/stocks/v1/top-gainers`,
    {
      method: "GET",
      headers: {Accept: "application/json"},
      cache: "no-store",
    }
  );
  return toFluctuations(data);
}