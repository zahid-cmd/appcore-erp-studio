//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.HumanResourceManangement.ProvidentFund;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund : EF configurations (tables made by
// HumanResource_ProvidentFund_Engine.sql; hand-written pages, no
// Code Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrProvidentFundConfiguration
    : IEntityTypeConfiguration<HrPfPolicy>,
      IEntityTypeConfiguration<HrPfMembers>,
      IEntityTypeConfiguration<HrPfTransactions>,
      IEntityTypeConfiguration<HrPfLoans>,
      IEntityTypeConfiguration<HrPfLoanRecoveries>,
      IEntityTypeConfiguration<HrPfSettlements>
{
    public void Configure(EntityTypeBuilder<HrPfPolicy> builder)
    {
        builder.ToTable("HrPfPolicy");
        builder.HasKey(x => x.PfPolicyId);
        builder.Property(x => x.PfPolicyId).ValueGeneratedOnAdd();
        builder.Property(x => x.EmployeePercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.CompanyContributes).IsRequired();
        builder.Property(x => x.CompanyPercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.ContributionBase).IsRequired().HasMaxLength(10);
        builder.Property(x => x.EligibilityRule).IsRequired().HasMaxLength(15);
        builder.Property(x => x.EligibilityMonths).IsRequired();
        builder.Property(x => x.InterestEnabled).IsRequired();
        builder.Property(x => x.InterestRate).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.LoanEnabled).IsRequired();
        builder.Property(x => x.LoanMaxPercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.LoanMaxInstallments).IsRequired();
        builder.Property(x => x.LoanInterestEnabled).IsRequired();
        builder.Property(x => x.LoanInterestRate).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.LoanInterestMethod).IsRequired().HasMaxLength(10);
        builder.Property(x => x.LoanEarlyFullInterest).IsRequired();
        builder.Property(x => x.VestingYears).IsRequired().HasPrecision(5, 2);
        builder.Property(x => x.VestingFrom).IsRequired().HasMaxLength(12);
        builder.Property(x => x.ForfeitOnMisconduct).IsRequired();
        builder.Property(x => x.FullOnDeathRetirement).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrPfMembers> builder)
    {
        builder.ToTable("HrPfMembers");
        builder.HasKey(x => x.PfMemberId);
        builder.Property(x => x.PfMemberId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrPfMembers_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrPfMembers_Code");
        builder.Property(x => x.EmployeeId).IsRequired();
        builder.Property(x => x.MemberDate).IsRequired();
        builder.Property(x => x.OpeningEmployee).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OpeningCompany).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.NomineeName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.NomineeRelation).IsRequired().HasMaxLength(50);
        builder.Property(x => x.NomineePhone).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrPfTransactions> builder)
    {
        builder.ToTable("HrPfTransactions");
        builder.HasKey(x => x.PfTransactionId);
        builder.Property(x => x.PfTransactionId).ValueGeneratedOnAdd();
        builder.HasIndex(x => new { x.PfMemberId, x.TxnDate }).HasDatabaseName("IX_HrPfTransactions_Member");
        builder.HasIndex(x => new { x.SourceType, x.SourceId }).HasDatabaseName("IX_HrPfTransactions_Source");
        builder.Property(x => x.TxnType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.EmployeeAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CompanyAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(300);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrPfLoans> builder)
    {
        builder.ToTable("HrPfLoans");
        builder.HasKey(x => x.PfLoanId);
        builder.Property(x => x.PfLoanId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrPfLoans_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrPfLoans_Code");
        builder.HasIndex(x => x.EmployeeId).HasDatabaseName("IX_HrPfLoans_Employee");
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.InstallmentAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.InterestRate).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.InterestMethod).IsRequired().HasMaxLength(10);
        builder.Property(x => x.TotalInterest).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.EarlyFullInterest).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrPfLoanRecoveries> builder)
    {
        builder.ToTable("HrPfLoanRecoveries");
        builder.HasKey(x => x.PfLoanRecoveryId);
        builder.Property(x => x.PfLoanRecoveryId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PfLoanId).HasDatabaseName("IX_HrPfLoanRecoveries_Loan");
        builder.HasIndex(x => x.SalarySheetId).HasDatabaseName("IX_HrPfLoanRecoveries_Sheet");
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.InterestAmount).IsRequired().HasPrecision(18, 2);
    }

    public void Configure(EntityTypeBuilder<HrPfSettlements> builder)
    {
        builder.ToTable("HrPfSettlements");
        builder.HasKey(x => x.PfSettlementId);
        builder.Property(x => x.PfSettlementId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrPfSettlements_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrPfSettlements_Code");
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(25);
        builder.Property(x => x.ServiceYears).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.EmployeeBalance).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CompanyBalance).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CompanyPaid).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CompanyForfeited).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.LoanOutstanding).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.NetPayable).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.RuleNote).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
