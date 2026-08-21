import AuthLayout from '../components/auth/AuthLayout'
import AuthForm from '../components/auth/AuthForm'

export default function RegisterPage() {
  return (
    <AuthLayout>
      <AuthForm mode="register" />
    </AuthLayout>
  )
}
