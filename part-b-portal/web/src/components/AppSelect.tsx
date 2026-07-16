import Select, { type StylesConfig } from 'react-select';

export interface Option {
  value: string;
  label: string;
}

const FOREST = '#013e37';
const FOREST_200 = '#9ec2bc';
const BUTTER_100 = '#fffae6';
const BUTTER_300 = '#ffefb3';

// On-brand react-select styling (butter + forest), compact for in-table use.
const styles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    borderRadius: 10,
    borderColor: state.isFocused ? FOREST : FOREST_200,
    boxShadow: state.isFocused ? `0 0 0 2px ${BUTTER_300}` : 'none',
    backgroundColor: 'white',
    fontSize: 13,
    fontWeight: 600,
    ':hover': { borderColor: FOREST },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
  dropdownIndicator: (base) => ({ ...base, padding: 4, color: FOREST_200 }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: 'hidden', zIndex: 40, fontSize: 13 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    fontWeight: 600,
    color: state.isSelected ? BUTTER_100 : FOREST,
    backgroundColor: state.isSelected ? FOREST : state.isFocused ? BUTTER_100 : 'white',
    ':active': { backgroundColor: BUTTER_300 },
  }),
  singleValue: (base) => ({ ...base, color: FOREST }),
};

export function AppSelect({
  options,
  value,
  onChange,
  isDisabled,
  isSearchable = false,
  ariaLabel,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  isSearchable?: boolean;
  ariaLabel?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Select<Option, false>
      aria-label={ariaLabel}
      options={options}
      value={selected}
      onChange={(opt) => opt && onChange(opt.value)}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      styles={styles}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
    />
  );
}
