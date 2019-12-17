/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.secrets;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.CharArrayReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.util.function.Supplier;

import org.apache.commons.io.IOUtils;

/**
 * Holder for secret information retrieved from a {@link SecretResolver}.
 * 
 * <p>
 * Secrets may be available in different formats, e.g. as {@code char[]} for passwords
 * or as streams for "bigger" secrets such as certificates or entire truststores or keystores.
 * Secrets are typically never stored as {@link String} but rather as {@code char[]} as it is 
 * not clearly defined when a String is garbage collected and the value removed from memory.  
 * It is up to the client to make use of the secret and choosing the appropriate format.
 * </p>
 * <p>
 * As a Secret may contain a stream it should always be properly closed, e.g. using a try-with-resources
 * expression.
 * </p>
 * <p>
 * Note: secrets provided as {@code char[]} can also be consumed as stream.
 * </p> 
 * 
 * @author Wolfgang Schell <ws@metaphacts.com>
 */
public class Secret implements AutoCloseable {
    protected char[] secret;
    protected Supplier<InputStream> data;
    
    /**
     * Create a Secret from a {@code char[]} .
     * @param secret the {@code char[]} of which the secret consists
     * @return secret containing the {@code char[]}
     */
    public static Secret fromChars(char[] secret) {
        return new Secret(secret);
    }
    
    /**
     * Create a Secret from a String.
     * @param secret the String of which the secret consists
     * @return secret containing the {@code char[]}
     */
    public static Secret fromString(String secret) {
        return new Secret(secret.toCharArray());
    }
    
    /**
     * Create a Secret from a stream. Note: the stream is not consume from the Secret, it 
     * will only be stored as reference, the stream can only be consumed once.
     * 
     * @param data supplier for a stream reference for the secret data. It is the client's responsibility to close the stream.
     * @return secret containing the {@code char[]}
     */
    public static Secret fromStream(Supplier<InputStream> data) {
        return new Secret(data);
    }
    
    /**
     * Create a Secret from a stream. Note: the stream is not consume from the Secret, it 
     * will only be stored as reference, the stream can only be consumed once.
     * 
     * @param data stream reference for the secret data. It is the clients responsibility to close the stream
     * @return secret containing the {@code char[]}
     */
    public static Secret fromStream(InputStream data) {
        return new Secret(() -> data);
    }

    /**
     * Create a Secret from a {@code char[]} .
     * @param secret the {@code char[]} of which the secret consists
     */
    protected Secret(char[] secret) {
        this.secret = secret;
        
    }
    
    /**
     * Create a Secret from a stream. Note: the stream is not consume from the Secret, it 
     * will only be stored as reference, the stream can only be consumed once.
     * 
     * @param data supplier for a stream reference for the secret data. It is the clients responsibility to close the stream
     */
    protected Secret(Supplier<InputStream> data) {
        this.data = data;
    }

    /**
     * Get secret as {@code char[]}. 
     * @return character data or <code>null</code> if not available as {@code char[]}
     */
    public char[] getSecret() {
        return secret;
    }
    
    /**
     * Determine whether the secret is stored as character data. 
     * 
     * <p>
     * Note: character data can still be accessed as stream using {@link #getSecretAsReader()} or 
     * {@link #getSecretAsStream()} as the data is converted automatically, but this method 
     * only returns <code>true</code> if the data is stored directly as character data.
     * </p> 
     * 
     * @return <code>true</code> if the secret is stored as character data, <code>false</code> otherwise
     */
    public boolean isCharacterData() {
        return (secret != null);
    }
    
    /**
     * Determine whether the secret is stored as stream.
     * 
     * <p>
     * Note: character data can still be accessed as String using {@link #getSecretAsString()} (but  
     * not using {@link #getSecret()}!) as the data is converted automatically, but this method only  
     * returns <code>true</code> if the data is stored directly as stream (possibly provided by a {@link Supplier}).
     * </p>
     * 
     * @return <code>true</code> if the secret is stored as stream, <code>false</code> otherwise
     */
    public boolean isStream() {
        return (data != null);
    }

    /**
     * Get secret as {@link String}. If the data is provided as stream, the stream is consumed and 
     * interpreted as UTF-8 encoded string. 
     * @return character data as String.
     */
    public String getSecretAsString() {
        if (secret != null) {
            return new String(secret);
        }
        if (data != null) {
            try (InputStream stream = data.get()) {
                return IOUtils.toString(stream, "UTF-8");
            } catch (IOException e) {
                throw new RuntimeException("Failed to read secret from stream: " + e.getMessage(), e);
            }
        }
        return null;
    }
    
    /**
     * Get secret as stream.  
     * @return character data as stream. It is the client's responsibility to close the stream.
     */
    public InputStream getSecretAsStream() {
        if (data != null) {
            return data.get();
        }
        if (secret != null) {
            // convert char array to byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PrintWriter printWriter = new PrintWriter(baos);
            printWriter.print(secret);
            printWriter.flush();
            return new ByteArrayInputStream(baos.toByteArray());
        }
        return null;
    }
    
    /**
     * Get secret as {@link Reader}.
     * If the data is provided as stream, the stream is wrapped in a InputStreamReader and interpreted as 
     * UTF-8 encoded string data. If the secret is stored as {@code char[]} it is wrapped into a {@link CharArrayReader} 
     * and returned to the caller. 
     * @return character data as {@link Reader}. It is the client's responsibility to close the {@link Reader}.
     */
    public Reader getSecretAsReader() {
        if (data != null) {
            try {
                return new InputStreamReader(data.get(), "UTF-8");
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
        if (secret != null) {
            return new CharArrayReader(secret);
        }
        return null;
    }
    
    @Override
    public void close() throws Exception {
        if (data != null) {
            InputStream stream = data.get();
            if (stream != null) {
                stream.close();
            }
        }
        secret = null;
    }
}