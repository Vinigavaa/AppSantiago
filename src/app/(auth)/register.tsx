import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { Text, type TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { Input } from "@/components/ui/Input"
import { ProfileTypeSelector } from "@/components/ui/ProfileTypeSelector"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas/auth-schemas"

export default function Register() {
  const { errorMessage, isSubmitting, signUp, successMessage } = useAuth()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
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
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
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
              onSubmitEditing={() => emailRef.current?.focus()}
              placeholder="seu.username"
              returnKeyType="next"
              submitBehavior="submit"
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
              keyboardType="email-address"
              label="Email"
              onChangeText={onChange}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="voce@email.com"
              ref={emailRef}
              returnKeyType="next"
              submitBehavior="submit"
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
              ref={passwordRef}
              returnKeyType="done"
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
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <Button label="Criar conta" loading={isSubmitting} onPress={handleSubmit(signUp)} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem conta?</Text>
        <Link href={routes.login} style={styles.link}>
          Entrar
        </Link>
      </View>
    </FormScroll>
  )
}
