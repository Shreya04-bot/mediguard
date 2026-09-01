import React from "react";
import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export function SearchInput({ onChange, ...props }) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4" aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder="Search"
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </InputGroup>
  );
}
