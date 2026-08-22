import React from 'react';
import { View, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { IconButton, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '@theme/ThemeProvider';

interface FormImageListProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  maxImages?: number;
}

/** Multi-image picker backed by expo-image-picker; stores local file URIs. */
export function FormImageList<T extends FieldValues>({ control, name, label, maxImages = 5 }: FormImageListProps<T>) {
  const theme = useAppTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const images: string[] = value ?? [];

        const pickImage = async () => {
          if (images.length >= maxImages) {
            Alert.alert('Limit reached', `You can attach up to ${maxImages} images.`);
            return;
          }
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow photo library access to attach images.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            onChange([...images, result.assets[0].uri]);
          }
        };

        const removeImage = (uri: string) => {
          onChange(images.filter((i) => i !== uri));
        };

        return (
          <View style={{ marginBottom: theme.custom.spacing.md }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.xs }}
            >
              {label}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {images.map((uri) => (
                  <View key={uri} style={styles.imageWrap}>
                    <Image source={{ uri }} style={[styles.image, { borderRadius: theme.custom.radius.md }]} />
                    <IconButton
                      icon="close-circle"
                      size={18}
                      style={styles.removeBtn}
                      onPress={() => removeImage(uri)}
                    />
                  </View>
                ))}
                <IconButton
                  icon="plus"
                  mode="outlined"
                  size={28}
                  style={[styles.addBtn, { borderRadius: theme.custom.radius.md }]}
                  onPress={pickImage}
                />
              </View>
            </ScrollView>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // Padding reserves space for the overlapping remove button so it stays within
  // bounds and remains tappable; negative offsets would push it outside, where
  // it still renders but stops receiving touches.
  imageWrap: { marginRight: 10, position: 'relative', paddingTop: 10, paddingRight: 10 },
  image: { width: 88, height: 88 },
  removeBtn: { position: 'absolute', top: 0, right: 0, margin: 0 },
  addBtn: { width: 88, height: 88, marginTop: 10 },
});
