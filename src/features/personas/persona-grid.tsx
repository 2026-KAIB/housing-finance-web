"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonaCategory, PersonaIndexEntry } from "@/lib/contracts/persona";
import { formatYm } from "@/lib/format/date";
import { categoryLabel, portfolioStatusLabel } from "@/lib/format/codes";
import { formatKoreanUnit } from "@/lib/format/money";

type Filter = PersonaCategory | "all";

const FILTERS: Filter[] = ["all", "basic", "affluent", "poor"];

function filterLabel(filter: Filter, count: number): string {
  const name = filter === "all" ? "전체" : categoryLabel(filter);
  return `${name} ${count}`;
}

export function PersonaGrid({ personas }: { personas: PersonaIndexEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all"
      ? personas
      : personas.filter((persona) => persona.category === filter);

  return (
    <section className="py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.04em]">
        페르소나 선택
      </h1>
      <p className="mb-6 text-muted">
        대학생 20명의 합성 마이데이터입니다. 한 명을 고르면 입력폼이 자동으로
        채워집니다.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const count =
            option === "all"
              ? personas.length
              : personas.filter((persona) => persona.category === option).length;

          return (
            <Button
              key={option}
              variant={filter === option ? "default" : "outline"}
              onClick={() => setFilter(option)}
            >
              {filterLabel(option, count)}
            </Button>
          );
        })}
      </div>

      <ul className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((persona) => (
          <li key={persona.persona_id}>
            <Link
              className="block h-full"
              href={`/input?persona=${persona.persona_id}`}
            >
              <Card className="h-full border-line transition-colors hover:border-accent">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {persona.display_name}
                    </CardTitle>
                    <Badge variant="outline">
                      {categoryLabel(persona.category)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <Row label="나이" value={`만 ${persona.headline.age}세`} />
                  <Row
                    label="월 소득"
                    value={formatKoreanUnit(persona.headline.monthly_income)}
                  />
                  <Row
                    label="월 지출"
                    value={formatKoreanUnit(persona.headline.monthly_expense)}
                  />
                  <Row
                    label="목표 보증금"
                    value={formatKoreanUnit(persona.headline.target_price)}
                  />
                  <Row
                    label="목표 시점"
                    value={formatYm(persona.headline.target_move_in_ym)}
                  />
                  {persona.portfolio_status !== "COMPLETE" && (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      {portfolioStatusLabel(persona.portfolio_status)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
