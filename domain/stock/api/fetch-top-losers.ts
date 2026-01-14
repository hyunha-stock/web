import {apiFetchClient} from "@/lib/http/client";
import {FluctuationOutputDto} from "@/domain/stock/types/fluctuation.dto";
import {toFluctuations} from "@/domain/stock/mappers/fluctuation.mapper";
import {Fluctuation} from "@/domain/stock/types/fluctuation.model";

export async function fetchTopLosers(): Promise<Fluctuation[]> {
  const data = await apiFetchClient<FluctuationOutputDto[]>(
    `/stocks/v1/top-losers`,
    {
      method: "GET",
      credentials: "include",
      headers: {Accept: "application/json"},
      cache: "no-store",
    }
  );
  return toFluctuations(data);
}