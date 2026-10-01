import type {
	EmployeeResponse,
	ReferenceDataResponse,
} from "@salary-manager/contracts";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@salary-manager/ui";
import { money } from "#/lib/format";
import { EmployeeProfileForm } from "../form/EmployeeProfileForm";
import { SalaryForm } from "../form/SalaryForm";
import { DeactivateEmployee } from "./DeactivateEmployee";

type EmployeeDetailsProps = {
	employee: EmployeeResponse;
	reference: ReferenceDataResponse;
};

export function EmployeeDetails({ employee, reference }: EmployeeDetailsProps) {
	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-1">
				<div className="flex items-center gap-3">
					<h1 className="m-0 text-xl font-semibold">{employee.name}</h1>
					{!employee.active && <Badge variant="secondary">Inactive</Badge>}
				</div>
				<p className="m-0 text-sm text-muted-foreground">
					{employee.code}, {employee.jobTitleName} {employee.level},{" "}
					{employee.departmentName}, {employee.countryName}
				</p>
			</header>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Salary</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1">
						<p className="m-0 text-3xl font-semibold tabular-nums">
							{money(
								employee.salaryMinorUnits,
								employee.currencyCode,
								employee.currencyMinorUnits,
							)}
						</p>
						<p className="m-0 text-sm text-muted-foreground">
							Annual base salary in {employee.currencyCode}
						</p>
						<hr className="my-4 border-0 border-t border-border" />
						<SalaryForm
							key={employee.id}
							employee={employee}
							reference={reference}
						/>
					</CardContent>
				</Card>
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader className="pb-0">
							<CardTitle>Profile</CardTitle>
						</CardHeader>
						<CardContent>
							<EmployeeProfileForm
								key={employee.id}
								employee={employee}
								reference={reference}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-0">
							<CardTitle>Status</CardTitle>
						</CardHeader>
						<CardContent>
							<DeactivateEmployee employee={employee} />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
