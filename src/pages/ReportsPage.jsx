import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Placeholder from '../components/Placeholder'

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        icon="reports"
        title="Báo cáo & KPI"
        description="Chỉ số hiệu quả của cá nhân, phòng ban và toàn công ty."
      />

      <Card>
        <Placeholder
          icon="reports"
          title="Báo cáo & KPI"
          description="Tổng hợp số liệu và đánh giá hiệu quả công việc."
          features={[
            'Bảng KPI theo cá nhân và phòng ban',
            'Biểu đồ tiến độ và năng suất theo thời gian',
            'Báo cáo định kỳ tuần, tháng, quý',
            'Xuất báo cáo ra tệp để trình bày',
          ]}
        />
      </Card>
    </>
  )
}
