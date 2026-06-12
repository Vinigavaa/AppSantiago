import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ProfileTypeSelector } from "@/components/ui/ProfileTypeSelector"
import { routes } from "@/constants/routes"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas/auth-schemas"

export default function Register() {
  const { errorMessage, isSubmitting, signUp } = useAuth()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "CLIENT",
    },
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Escolha como você vai usar o app.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="username"
                error={errors.username?.message}
                label="Username"
                onChangeText={onChange}
                placeholder="seu.username"
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="email"
                error={errors.email?.message}
                inputMode="email"
                label="Email"
                onChangeText={onChange}
                placeholder="voce@email.com"
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="new-password"
                error={errors.password?.message}
                label="Senha"
                onChangeText={onChange}
                placeholder="Mínimo de 8 caracteres"
                secureTextEntry
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <ProfileTypeSelector error={errors.role?.message} onChange={onChange} value={value} />
            )}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Button disabled={isSubmitting} label={isSubmitting ? "Criando..." : "Criar conta"} onPress={handleSubmit(signUp)} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta?</Text>
          <Link href={routes.login} style={styles.link}>
            Entrar
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    padding: 12,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#475569",
  },
  form: {
    gap: 14,
  },
  header: {
    gap: 8,
    marginBottom: 28,
  },
  link: {
    color: "#0F766E",
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "800",
  },
})
