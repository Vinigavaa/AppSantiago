import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { useAuth } from "@/features/auth/hooks/useAuth"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas/auth-schemas"

export default function ForgotPassword() {
  const { errorMessage, isSubmitting, requestPasswordReset, successMessage } = useAuth()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>Informe seu email para receber o link de redefinição.</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              onChangeText={onChange}
              onSubmitEditing={handleSubmit(requestPasswordReset)}
              placeholder="voce@email.com"
              returnKeyType="send"
              value={value}
            />
          )}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <Button
          label="Enviar link"
          loading={isSubmitting}
          onPress={handleSubmit(requestPasswordReset)}
        />
      </View>

      <Link href={routes.login} style={styles.linkCentered}>
        Voltar para login
      </Link>
    </FormScroll>
  )
}
