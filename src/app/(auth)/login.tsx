import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { Text, type TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { authStyles as styles } from "@/features/auth/authStyles"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { signInSchema, type SignInInput } from "@/features/auth/schemas/auth-schemas"

export default function Login() {
  const { errorMessage, isSubmitting, signIn } = useAuth()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  return (
    <FormScroll contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>
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
              autoComplete="password"
              error={errors.password?.message}
              label="Senha"
              onChangeText={onChange}
              onSubmitEditing={handleSubmit(signIn)}
              placeholder="Sua senha"
              ref={passwordRef}
              returnKeyType="done"
              secureTextEntry
              value={value}
            />
          )}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button label="Entrar" loading={isSubmitting} onPress={handleSubmit(signIn)} />

        <Link href={routes.forgotPassword} style={styles.linkCentered}>
          Esqueci minha senha
        </Link>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta?</Text>
        <Link href={routes.register} style={styles.link}>
          Criar conta
        </Link>
      </View>
    </FormScroll>
  )
}
